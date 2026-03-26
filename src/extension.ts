import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { LinglanMcpServer } from './ws-server';
import { HistoryStorage } from './storage';
import { SettingsManager, SUPPORTED_PROVIDERS } from './settings';
import { DashboardPanel } from './webview-provider';
import { QuotaService } from './api/quota-service';
import { QuotaModelsResponse } from './api/quota-fetcher';
import { toggleAutoAccept, disposeAutoAccept, isAutoAcceptActive } from './auto-accept';

let mcpServer: LinglanMcpServer;
let statusBarItem: vscode.StatusBarItem;
let storage: HistoryStorage | null = null;
let statusRefreshTimer: ReturnType<typeof setInterval> | undefined;
const quotaService = new QuotaService();

// CLI status cache — avoids blocking spawnSync on every 60s refresh
let cliStatusCache: { codex: boolean; gemini: boolean; ts: number } | null = null;
const CLI_CACHE_TTL = 300_000; // 5 minutes
let currentExtensionPath: string | undefined;
let isSyncingKeys = false;  // reentrant guard for syncKeysToFile

const KEYS_FILE = path.join(os.homedir(), '.l-hub-keys.json');

interface DisplayQuotaRow {
    modelName: string;
    remainingFraction: number;
    resetTime?: string;
}

function getQuotaEntries(quota: Record<string, any> | null): any[] {
    if (!quota) {
        return [];
    }

    const extract = (val: any) => {
        if (!val) return null;
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') {
            return Object.entries(val).map(([id, v]) => ({ id, ...(typeof v === 'object' && v ? v : {}) }));
        }
        return null;
    };

    return extract(quota.models) || extract(quota.availableModels) || extract(quota.modelStatuses) || [];
}

function normalizeQuotaRow(entry: any): DisplayQuotaRow | null {
    const modelName = entry.id ?? entry.name ?? entry.displayName ?? entry.model ?? entry.modelName;
    const remainingFraction = entry.remainingFraction ?? entry.quota?.remainingFraction ?? entry.quotaInfo?.remainingFraction;
    const resetTime = entry.resetTime ?? entry.resetTimestamp ?? entry.quota?.resetTime ?? entry.quota?.resetTimestamp ?? entry.quotaInfo?.resetTime;

    if (!modelName || typeof remainingFraction !== 'number' || !Number.isFinite(remainingFraction)) {
        return null;
    }

    return {
        modelName,
        remainingFraction: Math.max(0, Math.min(1, remainingFraction)),
        resetTime,
    };
}

function getHoverTableRows(quota: QuotaModelsResponse | null): DisplayQuotaRow[] {
    if (!quota) return [];

    let targetIds: string[] = [];
    try {
        const sorts: any = quota.agentModelSorts;
        if (Array.isArray(sorts) && sorts.length > 0 && sorts[0]?.groups?.length > 0) {
            targetIds = sorts[0].groups[0].modelIds || [];
        }
    } catch {}

    if (!targetIds || targetIds.length === 0) {
        targetIds = [
            "gemini-3.1-pro-high",
            "gemini-3.1-pro-low",
            "gemini-3-flash-agent",
            "claude-sonnet-4-6",
            "claude-opus-4-6-thinking",
            "gpt-oss-120b-medium"
        ];
    }
    
    const entries = getQuotaEntries(quota);
    const rows: DisplayQuotaRow[] = [];
    
    for (const id of targetIds) {
        const entry = entries.find((e: any) => e.id === id || e.name === id || e.model === id);
        if (entry) {
            const normalized = normalizeQuotaRow(entry);
            if (normalized) rows.push(normalized);
        }
    }
    
    return rows;
}

function formatQuotaPercentage(remainingFraction: number): string {
    const percentage = remainingFraction >= 1 ? 100 : Math.round(remainingFraction * 100);
    return `${percentage}%`;
}

function formatQuotaResetTime(resetTime?: string): string {
    if (!resetTime) {
        return '-';
    }

    const parsed = new Date(resetTime);
    if (Number.isNaN(parsed.getTime())) {
        return resetTime;
    }

    return parsed.toLocaleString('zh-CN', { hour12: false });
}

function getStatusBarQuotas(quota: QuotaModelsResponse | null): { gemini: DisplayQuotaRow | null, cloud: DisplayQuotaRow | null } {
    const entries = getQuotaEntries(quota);
    
    const geminiEntry = entries.find(e => {
        const name = e.id ?? e.name ?? e.displayName ?? e.model ?? e.modelName ?? '';
        return (name.toLowerCase().includes('gemini') && name.toLowerCase().includes('pro'));
    });

    const cloudEntry = entries.find(e => {
        const name = e.id ?? e.name ?? e.displayName ?? e.model ?? e.modelName ?? '';
        return name.toLowerCase().includes('claude') || name.toLowerCase().includes('gpt');
    });

    return {
        gemini: geminiEntry ? normalizeQuotaRow(geminiEntry) : null,
        cloud: cloudEntry ? normalizeQuotaRow(cloudEntry) : null
    };
}

function getQuotaStatusIcon(remainingFraction: number): string {
    if (remainingFraction > 0.3) return '🟢';
    if (remainingFraction > 0.05) return '🟡';
    return '🔴';
}

/**
 * Export API keys from Antigravity SecretStorage to ~/.l-hub-keys.json
 * so the standalone mcp-server.js can read them without vscode dependency.
 */
async function syncKeysToFile(settings: SettingsManager, dbPath?: string) {
    if (isSyncingKeys) { return; }
    isSyncingKeys = true;
    try {
        // Read existing file to preserve v2 `models` and other fields
        let existing: Record<string, any> = {};
        try {
            if (fs.existsSync(KEYS_FILE)) {
                existing = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
            }
        } catch { }

        const merged: Record<string, any> = { ...existing };
        // Remove deprecated legacy key block if present
        delete merged.legacy;
        // Write DB path so standalone mcp-server can log to the same SQLite
        if (dbPath) { merged.dbPath = dbPath; }
        fs.writeFileSync(KEYS_FILE, JSON.stringify(merged, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch (e) {
        console.error('[L-Hub] Failed to sync keys:', e);
    } finally {
        isSyncingKeys = false;
    }
}

/**
 * Reverse-sync: if SecretStorage has no v2 models but ~/.l-hub-keys.json does,
 * import them so the Dashboard can display them.
 */
async function importModelsFromFile(settings: SettingsManager): Promise<void> {
    try {
        const existingModels = await settings.getModels();
        if (existingModels.length > 0) { return; } // already populated

        if (!fs.existsSync(KEYS_FILE)) { return; }
        const data = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        const fileModels = data?.models as any[];
        if (!Array.isArray(fileModels) || fileModels.length === 0) { return; }

        // Strip apiKey from model objects before saving to SecretStorage
        const cleanModels = fileModels.map(m => {
            const { apiKey, ...rest } = m;
            return rest;
        });
        await settings.saveModels(cleanModels);

        // Save API keys into SecretStorage
        for (const m of fileModels) {
            if (m.apiKey && m.id) {
                await settings.saveApiKey(`model.${m.id}`, m.apiKey);
            }
        }
        console.log(`[L-Hub] Imported ${fileModels.length} models from ${KEYS_FILE} into SecretStorage`);
    } catch (e) {
        console.error('[L-Hub] Failed to import models from file:', e);
    }
}

/**
 * Auto-register the standalone mcp-server.js into Antigravity's MCP config.
 * By default it writes to ~/.gemini/antigravity/mcp_config.json under the "mcpServers" block.
 * Idempotent — safe to call on every activation.
 */
function autoRegisterMcpConfig(extensionPath: string) {
    const serverPath = path.join(extensionPath, 'dist', 'mcp-server.js');
    const mcpConfigPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');

    try {
        // Ensure parent directory exists (e.g. ~/.gemini/antigravity/ may not exist yet)
        const configDir = path.dirname(mcpConfigPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        let config: Record<string, any> = {};
        if (fs.existsSync(mcpConfigPath)) {
            try { config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8')); } catch { }
        }

        if (!config.mcpServers) { config.mcpServers = {}; }

        const existing = config.mcpServers['lhub'];
        const newEntry = { command: 'node', args: [serverPath], env: {} };

        if (!existing || existing.args?.[0] !== serverPath) {
            // Clean up hyphenated alias if present
            if (config.mcpServers['l-hub']) { delete config.mcpServers['l-hub']; }
            config.mcpServers['lhub'] = newEntry;
            fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 4), 'utf8');
            console.log(`[L-Hub] Auto-registered MCP server in Antigravity config (${mcpConfigPath}) ✅`);
        }
    } catch (err) {
        console.error(`[L-Hub] Failed to auto-register MCP config:`, err);
    }
}

// ─── ACA v2: Git Pre-Commit Hook ─────────────────────────────────────────────

const ACA_REPORT_FILE = path.join(os.tmpdir(), 'l-hub-aca-report.json');

/**
 * Auto-install the ACA pre-commit hook into every open workspace's .git directory.
 * Idempotent — only installs if not present or outdated.
 */
function autoInstallGitHook(extensionPath: string, enabled: boolean) {
    if (!enabled) {
        removeGitHook();
        return;
    }
    const runnerPath = path.join(extensionPath, 'dist', 'aca-runner.js');
    if (!fs.existsSync(runnerPath)) {
        console.warn('[L-Hub] aca-runner.js not found, skipping git hook install');
        return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return; }

    // Generate hook content with baked-in absolute path, wrapped in begin/end markers
    const MARKER_BEGIN = '# >>> L-Hub ACA BEGIN >>>';
    const MARKER_END = '# <<< L-Hub ACA END <<<';
    const hookBlock = [
        MARKER_BEGIN,
        '# Auto-installed by L-Hub extension. Skip with: git commit --no-verify',
        `RUNNER="${runnerPath}"`,
        'if [ -f "$RUNNER" ]; then',
        '    node "$RUNNER"',
        '    ACA_EXIT=$?',
        '    if [ $ACA_EXIT -ne 0 ]; then exit $ACA_EXIT; fi',
        'fi',
        MARKER_END,
    ].join('\n');

    for (const folder of workspaceFolders) {
        const gitHooksDir = path.join(folder.uri.fsPath, '.git', 'hooks');
        if (!fs.existsSync(gitHooksDir)) { continue; }

        const targetHook = path.join(gitHooksDir, 'pre-commit');

        if (fs.existsSync(targetHook)) {
            const existing = fs.readFileSync(targetHook, 'utf8');
            if (existing.includes(MARKER_BEGIN)) {
                // Replace only the L-Hub block, preserving everything else
                const re = new RegExp(
                    `${MARKER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                );
                if (existing.includes(runnerPath)) { continue; } // Already up to date
                const updated = existing.replace(re, hookBlock);
                fs.writeFileSync(targetHook, updated, { mode: 0o755 });
                console.log(`[L-Hub] ACA hook updated with new path at ${targetHook} ✅`);
                continue;
            }
            // Append to existing hook (user has other pre-commit logic)
            const merged = existing.trimEnd() + '\n\n' + hookBlock + '\n';
            fs.writeFileSync(targetHook, merged, { mode: 0o755 });
        } else {
            const fullHook = '#!/bin/sh\n\n' + hookBlock + '\n';
            fs.writeFileSync(targetHook, fullHook, { mode: 0o755 });
        }

        console.log(`[L-Hub] ACA pre-commit hook installed at ${targetHook} ✅`);
    }
}

/**
 * Remove the L-Hub ACA block from all workspace pre-commit hooks.
 */
function removeGitHook() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return; }

    const MARKER_BEGIN = '# >>> L-Hub ACA BEGIN >>>';
    const MARKER_END = '# <<< L-Hub ACA END <<<';

    for (const folder of workspaceFolders) {
        const targetHook = path.join(folder.uri.fsPath, '.git', 'hooks', 'pre-commit');
        if (!fs.existsSync(targetHook)) { continue; }

        const existing = fs.readFileSync(targetHook, 'utf8');
        if (!existing.includes(MARKER_BEGIN)) { continue; }

        const re = new RegExp(
            `\\n*${MARKER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n*`,
        );
        const cleaned = existing.replace(re, '\n').trim();

        if (cleaned === '' || cleaned === '#!/bin/sh') {
            fs.unlinkSync(targetHook);
            console.log(`[L-Hub] ACA hook removed from ${targetHook}`);
        } else {
            fs.writeFileSync(targetHook, cleaned + '\n', { mode: 0o755 });
            console.log(`[L-Hub] ACA block removed from ${targetHook}`);
        }
    }
}

/**
 * Watch the ACA report temp file. When the git hook writes a new report,
 * pop up a notification and push the report to the Dashboard.
 */
function watchAcaReports(context: vscode.ExtensionContext) {
    // Poll for report file changes (fs.watch is unreliable with /tmp)
    let lastReportTs = 0;

    const timer = setInterval(() => {
        try {
            if (!fs.existsSync(ACA_REPORT_FILE)) { return; }
            const stat = fs.statSync(ACA_REPORT_FILE);
            if (stat.mtimeMs <= lastReportTs) { return; }
            lastReportTs = stat.mtimeMs;

            const report = JSON.parse(fs.readFileSync(ACA_REPORT_FILE, 'utf8'));
            if (!report.results || !Array.isArray(report.results)) { return; }

            // Push to Dashboard ACA panel
            DashboardPanel.pushAcaAuditReport(report);

            // Pop up IDE notification
            const verdict = report.verdict as string;
            if (verdict === 'BLOCKED') {
                const details = report.results.map((r: any) => `[${r.reviewer}] ${r.summary}`).join('\n');
                vscode.window.showErrorMessage(
                    `🚨 ACA: Commit 已被拦截 — 发现严重问题`,
                    { modal: false, detail: details } as any
                );
            } else if (verdict === 'WARNING') {
                vscode.window.showWarningMessage(
                    `⚠️ ACA: 发现潜在问题，请留意审查报告`
                );
            }
        } catch { /* ignore parse errors */ }
    }, 3000);

    context.subscriptions.push({ dispose: () => clearInterval(timer) });
}

// ─── Auto Install Skill ──────────────────────────────────────────────────────

/**
 * Auto-install L-Hub's AI routing Skill into Antigravity's global skills directory.
 * Copies skills/lhub-ai-routing/SKILL.md → ~/.gemini/antigravity/skills/lhub-ai-routing/SKILL.md
 * Idempotent — overwrites on every activation to keep the Skill up to date.
 */
export function autoInstallSkill(extensionPath: string) {
    const srcSkillDir = path.join(extensionPath, 'skills', 'lhub-ai-routing');
    const srcSkillFile = path.join(srcSkillDir, 'SKILL.md');

    if (!fs.existsSync(srcSkillFile)) {
        console.warn('[L-Hub] SKILL.md not found in extension, skipping skill install');
        return;
    }

    const destSkillDir = path.join(os.homedir(), '.gemini', 'antigravity', 'skills', 'lhub-ai-routing');
    const destSkillFile = path.join(destSkillDir, 'SKILL.md');

    try {
        if (!fs.existsSync(destSkillDir)) {
            fs.mkdirSync(destSkillDir, { recursive: true });
        }

        let skillContent = fs.readFileSync(srcSkillFile, 'utf8');

        // Apply user routing preferences overrides if any
        const config = vscode.workspace.getConfiguration('lhub.routing');
        const rRoutine = config.get<string>('routine', 'auto');
        const rCode = config.get<string>('code', 'codex-cli');
        const rReasoning = config.get<string>('reasoning', 'auto');
        const rCreative = config.get<string>('creative', 'auto');

        let overrides = [];
        const formatProviderCall = (val: string) => {
            if (val === 'codex-cli') return '必须调用 `mcp_lhub_ai_codex_task()`';
            if (val === 'gemini-cli') return '必须调用 `mcp_lhub_ai_gemini_task()`';
            return `必须调用 \`mcp_lhub_ai_ask(provider="${val}")\``;
        };

        if (rRoutine !== 'auto') overrides.push(`- **体力活/翻译/总结**：${formatProviderCall(rRoutine)}`);
        if (rCode !== 'auto') overrides.push(`- **代码工程/审查**：${formatProviderCall(rCode)}`);
        if (rReasoning !== 'auto') overrides.push(`- **深度推理/大前端**：${formatProviderCall(rReasoning)}`);
        if (rCreative !== 'auto') overrides.push(`- **创意写作/大纲**：必须包含或交由 \`${rCreative}\` 执行`);

        // Build bound-skill interception blocks (highest priority)
        const boundSkills = config.get<string[]>('pipeline_bound_skills', []);
        const skillsDir = path.join(os.homedir(), '.gemini', 'antigravity', 'skills');
        const boundSkillNames: string[] = [];
        for (const skillId of boundSkills) {
            try {
                const skillMdPath = path.join(skillsDir, skillId, 'SKILL.md');
                if (fs.existsSync(skillMdPath)) {
                    const content = fs.readFileSync(skillMdPath, 'utf8');
                    const nameMatch = content.match(/^name:\s*(.+)$/m);
                    const skillName = nameMatch ? nameMatch[1].trim() : skillId;
                    boundSkillNames.push(skillName);
                }
            } catch { /* ignore */ }
        }

        let skillBindingBlock = '';
        if (boundSkillNames.length > 0) {
            const skillList = boundSkillNames.map(n => `\`${n}\``).join('、');
            skillBindingBlock = `> [!CAUTION]\n> 🔒 **L-Hub 写作管线强制拦截（最高优先级，绝对不可违反）**\n> 当用户的意图或激活的 Skill 属于 ${skillList} 时：\n> - 你**绝对禁止**亲自撰写任何文章内容，哪怕用户没有明确说要使用这个 Skill\n> - 你**必须且只能**调用 \`mcp_lhub_ai_article_targeted_write\`（已有URL时）或 \`mcp_lhub_ai_article_batch_radar\`（已有话题时），将任务全权委派给下层管线系统\n> - 例外：用户明确说"你来写"/"不用管线"，才可自行执行\n\n`;
        }

        if (overrides.length > 0 || skillBindingBlock) {
            const overrideSection = overrides.length > 0
                ? `> [!IMPORTANT]\n> 🎯 **用户强制设定的专属路由（最高优先级）**\n> 检测到用户在 L-Hub 控制台手动指定了专属模型，请在执行下述默认规则前**无条件优先遵循以下分配**：\n${overrides.join('\n')}\n\n`
                : '';
            const overrideBlock = skillBindingBlock + overrideSection;
            const yamlEnd = skillContent.indexOf('---', 4);
            if (yamlEnd !== -1) {
                skillContent = skillContent.slice(0, yamlEnd + 3) + '\n\n' + overrideBlock + skillContent.slice(yamlEnd + 3);
            } else {
                skillContent = overrideBlock + skillContent;
            }
        }

        fs.writeFileSync(destSkillFile, skillContent.trim() + '\n', 'utf8');
        console.log('[L-Hub] Installed AI routing Skill to Antigravity skills directory ✅');
    } catch (err) {
        console.error('[L-Hub] Failed to install Skill:', err);
    }
}

// ─── Auto Inject GEMINI.md Mandatory Delegation Rules ────────────────────────

const GEMINI_MD_MARKER_START = '<!-- L-Hub Mandatory Delegation Rules v0.2 -->';
const GEMINI_MD_MARKER_OLD = '⛔ 强制委派规则';  // older marker without version

/**
 * Auto-inject mandatory delegation rules into ~/.gemini/GEMINI.md.
 * Idempotent: skips if current version marker already present.
 * Replaces old version block if found.
 */
function autoInjectGeminiMd() {
    const geminiDir = path.join(os.homedir(), '.gemini');
    const geminiMdPath = path.join(geminiDir, 'GEMINI.md');

    try {
        if (!fs.existsSync(geminiDir)) {
            fs.mkdirSync(geminiDir, { recursive: true });
        }

        let content = fs.existsSync(geminiMdPath) ? fs.readFileSync(geminiMdPath, 'utf8') : '';

        const config = vscode.workspace.getConfiguration('lhub.routing');
        const rRoutine = config.get<string>('routine', 'auto');
        const rCreative = config.get<string>('creative', 'auto');
        const rCode = config.get<string>('code', 'codex-cli');

        const routineCall = rRoutine === 'auto' ? '`mcp_lhub_ai_ask()`' : `\`mcp_lhub_ai_ask(provider="${rRoutine}")\``;
        const creativeCall = rCreative === 'auto' ? '`mcp_lhub_ai_ask()`' : `\`mcp_lhub_ai_ask(provider="${rCreative}")\``;
        
        let codeCall = '\`mcp_lhub_ai_codex_task()\`';
        if (rCode !== 'auto' && rCode !== 'codex-cli') {
            if (rCode === 'gemini-cli') codeCall = '\`mcp_lhub_ai_gemini_task()\`';
            else codeCall = '\`mcp_lhub_ai_ask(provider="' + rCode + '")\`';
        }

        const GEMINI_MD_RULES_BLOCK = `
${GEMINI_MD_MARKER_START}

## ⛔ 强制委派规则（不可违反）

以下任务**主模型绝对禁止自己直接输出**，必须先通过 L-Hub MCP 委派：

| 任务类型 | 禁止行为 | 必须执行 |
|---------|---------|--------|
| 文案 / 版本说明 / 公告 / 介绍 | ❌ 主模型直接写 | ✅ ${routineCall} |
| 翻译（任意语言互译） | ❌ 主模型直接译 | ✅ ${routineCall} |
| 总结 / 整理 / 归纳 | ❌ 主模型直接写 | ✅ ${routineCall} |
| 创意写作 / 中文文学内容 | ❌ 主模型直接写 | ✅ ${creativeCall} |
| 代码生成 / 跨文件实现 | ❌ 主模型直接写代码 | ✅ ${codeCall} |

**唯一例外：用户明确说"你来写"/"用 Claude 写"/"不用 MCP"时，按用户指示执行。**

主模型直接输出上述类型内容（未先调 MCP）= 违规，事后必须道歉并补充委派。

<!-- L-Hub Mandatory Delegation Rules End -->
`;

        if (content.includes(GEMINI_MD_MARKER_START) && content.includes(routineCall) && content.includes(creativeCall) && content.includes(codeCall)) {
            console.log('[L-Hub] GEMINI.md delegation rules already up-to-date, skipping');
            return;
        }

        if (content.includes(GEMINI_MD_MARKER_OLD) || content.includes(GEMINI_MD_MARKER_START)) {
            content = content.replace(/\n?<!-- L-Hub Mandatory.*?End -->\n?/s, '').replace(/\n?## ⛔ 强制委派规则[\s\S]*?主模型直接输出上述类型内容.*?\n/s, '');
        }

        const updated = content.trimEnd() + '\n' + GEMINI_MD_RULES_BLOCK;
        fs.writeFileSync(geminiMdPath, updated, 'utf8');
        console.log('[L-Hub] Auto-injected mandatory delegation rules into GEMINI.md ✅');
    } catch (err) {
        console.error('[L-Hub] Failed to inject GEMINI.md rules:', err);
    }
}

// ─── Auto Routing Rules ───────────────────────────────────────────────────────

const LHUB_RULES_MARKER = '[L-Hub Auto-Routing]';
const LHUB_RULES_VERSION = '[L-Hub-Rules-v2]';

/**
 * Auto-inject routing rules into Antigravity's geminicodeassist.rules setting.
 * Strategy: multi-model parallel + host model arbitration.
 * Priority: save Antigravity quota first, features second.
 * Idempotent — safe to call on every activation. Version-aware — updates on upgrade.
 */
async function autoInjectRoutingRules(settings: SettingsManager) {
    try {
        const config = vscode.workspace.getConfiguration('geminicodeassist');
        let currentRules = config.get<string>('rules', '');

        // Already on latest version — skip
        if (currentRules.includes(LHUB_RULES_VERSION)) {
            console.log('[L-Hub] Routing rules already up-to-date, skipping injection');
            return;
        }

        // Remove old version block if present (upgrade path)
        if (currentRules.includes(LHUB_RULES_MARKER)) {
            const markerIdx = currentRules.indexOf(LHUB_RULES_MARKER);
            currentRules = currentRules.substring(0, markerIdx).trimEnd();
            console.log('[L-Hub] Removing old routing rules for upgrade');
        }

        // Detect which models the user has configured
        const models = await settings.getModels();
        const enabledModels = models.filter(m => m.enabled !== false);
        const hasProvider = (keyword: string) => enabledModels.some(m =>
            m.label.toLowerCase().includes(keyword) || m.modelId.toLowerCase().includes(keyword)
        );

        // Detect CLI tools
        const codexInstalled = !spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 3000, shell: true }).error;
        const geminiInstalled = !spawnSync('gemini', ['--version'], { encoding: 'utf8', timeout: 3000, shell: true }).error;

        // Build dynamic rules based on what's actually available
        const creativeConfig = await settings.getCreativeChainConfig();

        // ── Map tasks to configured model IDs ──
        const taskAssignments: Record<string, string[]> = {};
        for (const m of enabledModels) {
            for (const task of m.tasks) {
                if (!taskAssignments[task]) taskAssignments[task] = [];
                taskAssignments[task].push(m.modelId);
            }
        }

        const getRouteCall = (modelId: string) => {
             if (modelId === 'Codex CLI') return 'mcp_lhub_ai_codex_task()';
             if (modelId === 'Gemini CLI') return 'mcp_lhub_ai_gemini_task()';
             // Default to deepseek if no map found
             const lower = modelId.toLowerCase();
             let provider = 'deepseek';
             if (lower.includes('glm') || lower.includes('zhipu')) provider = 'glm';
             if (lower.includes('qwen')) provider = 'qwen';
             if (lower.includes('minimax')) provider = 'minimax';
             return `mcp_lhub_ai_ask(provider="${provider}")`;
        };

        const formatRouteLine = (logicLabel: string, taskKey: string) => {
            const assigned = taskAssignments[taskKey];
            if (!assigned || assigned.length === 0) return null;
            const primary = assigned[0];
            const secondary = assigned.length > 1 ? assigned.slice(1).join(', ') : '';
            const backupTxt = secondary ? `，备选: ${secondary}` : '';
            return `- ${logicLabel} → ${getRouteCall(primary)} (首选: ${primary}${backupTxt})`;
        };

        const rules: string[] = [
            LHUB_RULES_MARKER,
            LHUB_RULES_VERSION,
            '核心策略：多模型智能分发（根据您的 L-Hub 路由配置，最大化节省 Antigravity 额度）',
            '主模型（你）只做调度、决策和交付，必须通过 MCP 委派具体任务给 L-Hub 中的专家模型。',
            '',
            '=== 基础开发委派矩阵 ===',
        ];

        const rCodeGen = formatRouteLine('代码生成 / 新功能实现', 'code_gen');
        if (rCodeGen) rules.push(rCodeGen);
        const rCodeReview = formatRouteLine('复杂调试 / 重构检查', 'code_review');
        if (rCodeReview) rules.push(rCodeReview);
        const rArch = formatRouteLine('系统架构 / 方案设计', 'architecture');
        if (rArch) rules.push(rArch);
        const rAgentic = formatRouteLine('独立多步 Agentic 探测', 'agentic');
        if (rAgentic) rules.push(rAgentic);
        const rTool = formatRouteLine('复杂 API / 工具调用链', 'tool_calling');
        if (rTool) rules.push(rTool);

        rules.push('', '=== 通用任务委派矩阵 ===');
        const rTrans = formatRouteLine('任意语言互相翻译', 'translation');
        if (rTrans) rules.push(rTrans);
        const rDoc = formatRouteLine('文档编写 / 代码注释', 'documentation');
        if (rDoc) rules.push(rDoc);
        const rLong = formatRouteLine('超长文本连贯性分析', 'long_context');
        if (rLong) rules.push(rLong);
        const rVision = formatRouteLine('图像理解 / 多模态视觉', 'vision');
        if (rVision) rules.push(rVision);
        const rUI = formatRouteLine('前端 UI / UX 设计', 'ui_design');
        if (rUI) rules.push(rUI);
        const rMath = formatRouteLine('算法设计 / 数学推理', 'math_reasoning');
        if (rMath) rules.push(rMath);

        const hasOutline = creativeConfig.outlineModels.length > 0;
        const hasDraft = creativeConfig.draftModels.length > 0;
        const hasPolish = creativeConfig.polishModel;
        const hasEval = creativeConfig.evalModel;

        if (hasOutline || hasDraft || hasPolish || hasEval) {
            rules.push('', '=== 创意写作链（多模型协作）===');
            rules.push('中文小说/文章写作时，严格按照用户配置的串流执行：');
            
            if (hasOutline) {
                rules.push(`1. 大纲竞标：使用 ${creativeConfig.outlineModels.join(' 与 ')} 并行出大纲，主模型综合择优。`);
            }
            if (hasDraft) {
                rules.push(`2. 初稿竞写：使用 ${creativeConfig.draftModels.join(' 与 ')} 并行写初稿，主模型融合最好段落。`);
            }
            if (hasPolish) {
                rules.push(`3. 文笔打磨：mcp_lhub_ai_ask 委派给 ${creativeConfig.polishModel} 进行去GPT味/润色。`);
            }
            if (hasEval) {
                rules.push(`4. 逻辑审查：mcp_lhub_ai_ask 委派给 ${creativeConfig.evalModel} 进行最后连贯性与幻觉检查。`);
            }
            rules.push('5. 主模型交付最终结果（不再亲自修改内容）');
        }

        if (enabledModels.length > 1) {
            rules.push('', '=== 多方案对比 ===');
            rules.push('- 需要多视角/对比方案 → mcp_lhub_ai_multi_ask() 并行问复数提供商');
        }

        rules.push('', '=== 主模型专属（不委派）===');
        rules.push('（如果用户明确说"你来写"，或任务不在上述矩阵中，则主模型直接执行，不再强制委派）');
        rules.push('- 架构设计/系统方案 → 主模型自己做');
        rules.push('- 最终决策/综合输出 → 主模型自己做');
        rules.push('- 与用户对话 → 主模型自己做');

        const routingRules = rules.join('\n');

        // Append to existing rules (don't overwrite user's custom rules)
        const merged = currentRules
            ? currentRules + '\n\n' + routingRules
            : routingRules;

        await config.update('rules', merged, vscode.ConfigurationTarget.Global);
        console.log('[L-Hub] Auto-injected routing rules into geminicodeassist.rules ✅');
    } catch (err) {
        console.error('[L-Hub] Failed to inject routing rules:', err);
    }
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

/**
 * Update the status bar item to reflect current model configuration state.
 * Called on activation and periodically via timer.
 */
async function updateStatusBar(settings: SettingsManager) {
    if (!statusBarItem) { return; }

    try {
        const models = await settings.getModels();

        // ── Resolve which models have API keys configured ──
        const modelStatuses: Array<{ label: string; enabled: boolean; hasKey: boolean }> = [];
        for (const m of models) {
            const key = await settings.getModelApiKey(m.id);
            modelStatuses.push({ label: m.label, enabled: m.enabled, hasKey: !!key });
        }

        // ── CLI status (cached for 5 min to avoid blocking main thread) ──
        const now = Date.now();
        if (!cliStatusCache || (now - cliStatusCache.ts) > CLI_CACHE_TTL) {
            const codexCheck = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 3000, shell: true });
            const geminiCheck = spawnSync('gemini', ['--version'], { encoding: 'utf8', timeout: 3000, shell: true });
            cliStatusCache = { codex: !codexCheck.error, gemini: !geminiCheck.error, ts: now };
        }
        const codexOk = cliStatusCache.codex;
        const geminiOk = cliStatusCache.gemini;

        // Add CLIs to statuses
        modelStatuses.push({ label: 'Codex CLI', enabled: true, hasKey: codexOk });
        modelStatuses.push({ label: 'Gemini CLI', enabled: true, hasKey: geminiOk });

        const ready = modelStatuses.filter(m => m.enabled && m.hasKey);
        const total = modelStatuses.length;
        const readyCount = ready.length;

        // ── Determine icon & color ──
        let icon: string;
        let color: vscode.ThemeColor | undefined;
        if (readyCount === 0) {
            icon = '$(error)';
            color = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (readyCount < total) {
            icon = '$(warning)';
            color = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            icon = '$(pulse)';
            color = undefined; // default
        }

        const cachedQuota = quotaService.getCachedQuota();
        const summaryQuotas = getStatusBarQuotas(cachedQuota);

        // ── Status bar text ──
        if (summaryQuotas.gemini || summaryQuotas.cloud) {
            const parts = [];
            if (summaryQuotas.gemini) parts.push(`${getQuotaStatusIcon(summaryQuotas.gemini.remainingFraction)} Gemini: ${formatQuotaPercentage(summaryQuotas.gemini.remainingFraction)}`);
            if (summaryQuotas.cloud) parts.push(`${getQuotaStatusIcon(summaryQuotas.cloud.remainingFraction)} Claude: ${formatQuotaPercentage(summaryQuotas.cloud.remainingFraction)}`);
            statusBarItem.text = `$(pulse) L-Hub | ${parts.join(' | ')}`;
        } else if (readyCount === 0) {
            statusBarItem.text = `${icon} L-Hub: 未配置`;
        } else if (readyCount < total) {
            statusBarItem.text = `${icon} L-Hub: ${readyCount}/${total} 就绪`;
        } else {
            statusBarItem.text = `${icon} L-Hub: ${readyCount} 模型就绪`;
        }
        statusBarItem.backgroundColor = color;

        // ── Tooltip (MarkdownString for rich content) ──
        const tooltip = new vscode.MarkdownString('', true);
        tooltip.isTrusted = true;
        tooltip.supportHtml = true;

        tooltip.appendMarkdown('### 🚀 L-HUB 核心中枢 (Mission Control)\n\n');

        // ==== CLOUD MODELS TABLE ====
        tooltip.appendMarkdown('| 🌐 **CLOUD EXPERT BRANDS** | 📡 **STATUS** | 🔐 **ACCESS KEY** |\n');
        tooltip.appendMarkdown('| :--- | :---: | :---: |\n');

        const apiModels = modelStatuses.filter(m => !m.label.includes('CLI'));
        if (apiModels.length === 0) {
            tooltip.appendMarkdown('| `未配置 / Not Configured` | - | - |\n');
        } else {
            for (const m of apiModels) {
                const isReady = m.enabled && m.hasKey;
                const icon = isReady ? '🟢' : (m.enabled ? '🔴' : '⚪');
                const statusState = isReady ? '`ONLINE`' : (!m.enabled ? '`DISABLED`' : '`STANDBY`');
                const keyState = m.hasKey ? '`SECURE`' : '`MISSING`';
                tooltip.appendMarkdown(`| ${icon} **${m.label.toUpperCase()}** | ${statusState} | ${keyState} |\n`);
            }
        }
        tooltip.appendMarkdown('\n');

        // ==== CLI SANDBOXES TABLE ====
        tooltip.appendMarkdown('| 💻 **LOCAL CLI SANDBOXES** | 🔌 **DAEMON** | 📦 **RUNTIME** |\n');
        tooltip.appendMarkdown('| :--- | :---: | :---: |\n');
        
        const codexIcon = codexOk ? '🟢' : '🔴';
        const codexDaemon = codexOk ? '`ACTIVE`' : '`OFFLINE`';
        const codexRuntime = codexOk ? '`ATTACHED`' : '`MISSING`';
        tooltip.appendMarkdown(`| ${codexIcon} **CODEX CLI** | ${codexDaemon} | ${codexRuntime} |\n`);

        const geminiIcon = geminiOk ? '🟢' : '🔴';
        const geminiDaemon = geminiOk ? '`ACTIVE`' : '`OFFLINE`';
        const geminiRuntime = geminiOk ? '`ATTACHED`' : '`MISSING`';
        tooltip.appendMarkdown(`| ${geminiIcon} **GEMINI CLI** | ${geminiDaemon} | ${geminiRuntime} |\n\n`);

        // ==== ROUTING PREFS TABLE ====
        const routingConfig = vscode.workspace.getConfiguration('lhub.routing');
        const formatRoute = (r: string) => r === 'auto' ? '`L-Hub Auto`' : `\`${r}\``;
        tooltip.appendMarkdown('| 🧠 **DYNAMIC ROUTING MAP** | 🎯 **ASSIGNED EXECUTOR** |\n');
        tooltip.appendMarkdown('| :--- | :--- |\n');
        tooltip.appendMarkdown(`| ⚡ **Routine (日常通识)** | ${formatRoute(routingConfig.get<string>('routine', 'auto'))} |\n`);
        tooltip.appendMarkdown(`| 💻 **Coding (代码工程)** | ${formatRoute(routingConfig.get<string>('code', 'auto'))} |\n`);
        tooltip.appendMarkdown(`| 🔬 **Reasoning (深度推理)**| ${formatRoute(routingConfig.get<string>('reasoning', 'auto'))} |\n`);
        tooltip.appendMarkdown(`| 🎨 **Creative (创意写作)**| ${formatRoute(routingConfig.get<string>('creative', 'auto'))} |\n\n`);

        // ==== QUOTA SENTINEL TABLE ====
        const quotaRows = getHoverTableRows(cachedQuota);
        tooltip.appendMarkdown('| 🔋 **ANTIGRAVITY QUOTA SENTINEL** | 📊 **REMAINING** | ⏳ **RESET TIME** |\n');
        tooltip.appendMarkdown('| :--- | :---: | :---: |\n');
        if (quotaRows.length === 0) {
            tooltip.appendMarkdown('| `Quota data unavailable` | `-` | `-` |\n\n');
        } else {
            for (const row of quotaRows) {
                tooltip.appendMarkdown(`| ${row.modelName} | ${formatQuotaPercentage(row.remainingFraction)} | ${formatQuotaResetTime(row.resetTime)} |\n`);
            }
            tooltip.appendMarkdown('\n');
        }

        // ==== TELEMETRY MATRIX ====
        let todayReq = 0; let sucCount = 0; let tLat = 0; let tTok = 0;
        if (storage) {
            try {
                const records = storage.queryHistory(1, 100)?.records || [];
                const tsToday = new Date().setHours(0, 0, 0, 0);
                for (const r of records) {
                    if (r.timestamp >= tsToday) {
                        todayReq++;
                        if (r.status === 'success') sucCount++;
                        tLat += r.duration || 0;
                        tTok += r.totalTokens || 0;
                    }
                }
            } catch(e) {}
        }
        const sr = todayReq > 0 ? Math.round((sucCount / todayReq)*100) : 100;
        const avgLat = todayReq > 0 ? (tLat / todayReq / 1000).toFixed(1)+'s' : '-';
        const tokDisp = tTok > 1000 ? (tTok / 1000).toFixed(1)+'K' : (tTok || '-');

        tooltip.appendMarkdown('| 📊 **NETWORK TELEMETRY (24H)** | 📉 **METRICS** |\n');
        tooltip.appendMarkdown('| :--- | :---: |\n');
        tooltip.appendMarkdown(`| 📡 **Total Request Vol** | \`${todayReq}\` |\n`);
        tooltip.appendMarkdown(`| ✅ **Success Rate** | \`${sr}%\` |\n`);
        tooltip.appendMarkdown(`| ⏱️ **Avg Latency** | \`${avgLat}\` |\n`);
        tooltip.appendMarkdown(`| 🪙 **Token Yield** | \`${tokDisp}\` |\n\n`);

        tooltip.appendMarkdown('---\n\n_$(server-environment) 点击打开全局仪表盘 (Open Global Dashboard)_');

        statusBarItem.tooltip = tooltip;
        statusBarItem.show();
    } catch (err) {
        console.error('[L-Hub] Failed to update status bar:', err);
        statusBarItem.text = '$(error) L-Hub';
        statusBarItem.tooltip = 'L-Hub: 状态获取失败';
        statusBarItem.show();
    }
}


// ─── Activation ───────────────────────────────────────────────────────────────

export async function activate(context: vscode.ExtensionContext) {
    console.log('[L-Hub] Activating...');

    const settings = new SettingsManager(context);

    // ── STEP 1: Register commands immediately — BEFORE anything that could throw ──

    const openPanelCommand = vscode.commands.registerCommand('l-hub.openPanel', () => {
        // storage may be null if SQLite failed — DashboardPanel handles null gracefully
        DashboardPanel.createOrShow(context.extensionUri, storage, settings, () => updateStatusBar(settings));
    });
    context.subscriptions.push(openPanelCommand);

    const autoAcceptCmd = vscode.commands.registerCommand('l-hub.toggleAutoAccept', () => toggleAutoAccept(context));
    context.subscriptions.push(autoAcceptCmd);

    console.log('[L-Hub] Command l-hub.openPanel registered ✅');

    // ── STEP 2: Initialize history storage (may fail if better-sqlite3 ABI mismatch) ──
    try {
        const storagePath = context.globalStorageUri.fsPath;
        storage = new HistoryStorage(storagePath);
        storage.cleanupOldRecords(30);
        console.log('[L-Hub] HistoryStorage initialized ✅');
    } catch (err) {
        console.error('[L-Hub] HistoryStorage failed to init (SQLite ABI issue?), history will be disabled:', err);
    }

    // ── STEP 3: Detect IDE + Import/Sync keys + auto-register MCP config ──
    await importModelsFromFile(settings);  // reverse-sync: file → SecretStorage
    const dbFilePath = path.join(context.globalStorageUri.fsPath, 'history.db');
    await syncKeysToFile(settings, dbFilePath);
    currentExtensionPath = context.extensionPath;
    autoRegisterMcpConfig(context.extensionPath);

    // Antigravity-specific features: Skill install, GEMINI.md injection, routing rules
    autoInstallSkill(context.extensionPath);
    autoInjectGeminiMd();
    await autoInjectRoutingRules(settings);

    // ── STEP 3.5: ACA v2 — Install git hook + watch for audit reports ──
    const acaRaw = await settings.getApiKey('__aca_enabled__');
    const acaEnabled = acaRaw !== 'false'; // default true
    autoInstallGitHook(context.extensionPath, acaEnabled);
    if (acaEnabled) { watchAcaReports(context); }

    // ── STEP 4: Create Status Bar Item ──
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'l-hub.openPanel';
    statusBarItem.name = 'L-Hub Status';
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push({ dispose: () => quotaService.dispose() });

    await quotaService.startPolling();

    // Initial update
    await updateStatusBar(settings);

    // Refresh every 60 seconds
    statusRefreshTimer = setInterval(() => updateStatusBar(settings), 60_000);

    console.log('[L-Hub] StatusBar indicator created ✅');


    // ── STEP 5: Start WebSocket server (non-critical) ──
    try {
        mcpServer = new LinglanMcpServer(storage, settings);
        await mcpServer.start();
        console.log('[L-Hub] WS MCP server started ✅');
    } catch (err) {
        console.error('[L-Hub] WS server failed to start (non-critical):', err);
    }
}

/**
 * Cleanup all L-Hub residuals when the extension is disabled or uninstalled.
 * Keeps ~/.l-hub-keys.json (API keys) intact.
 */
async function cleanupLHub() {
    const home = os.homedir();

    // 1. Remove lhub entry from Antigravity MCP config
    const mcpConfigPath = path.join(home, '.gemini', 'antigravity', 'mcp_config.json');
    try {
        if (fs.existsSync(mcpConfigPath)) {
            const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
            if (config.mcpServers) {
                delete config.mcpServers['lhub'];
                delete config.mcpServers['l-hub'];
                fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 4), 'utf8');
                console.log('[L-Hub] Removed MCP config entry ✅');
            }
        }
    } catch (e) { console.error('[L-Hub] cleanup: config error', e); }

    // 2. Remove Skill directory
    try {
        const skillDir = path.join(home, '.gemini', 'antigravity', 'skills', 'lhub-ai-routing');
        if (fs.existsSync(skillDir)) {
            fs.rmSync(skillDir, { recursive: true, force: true });
            console.log('[L-Hub] Removed Skill directory ✅');
        }
    } catch (e) { console.error('[L-Hub] cleanup: skill dir error', e); }

    // 3. Remove L-Hub injection block from GEMINI.md
    try {
        const geminiMdPath = path.join(home, '.gemini', 'GEMINI.md');
        if (fs.existsSync(geminiMdPath)) {
            let content = fs.readFileSync(geminiMdPath, 'utf8');
            // Remove the injection block (between start and end markers, inclusive)
            content = content.replace(
                /\n?<!-- L-Hub Mandatory.*?-->(\n[\s\S]*?<!-- L-Hub Mandatory.*?End -->)?\n?/gs,
                ''
            );
            fs.writeFileSync(geminiMdPath, content.trimEnd() + '\n', 'utf8');
            console.log('[L-Hub] Removed GEMINI.md injection block ✅');
        }
    } catch (e) { console.error('[L-Hub] cleanup: GEMINI.md error', e); }

    // 4. Remove L-Hub routing rules from geminicodeassist.rules
    try {
        const config = vscode.workspace.getConfiguration('geminicodeassist');
        const currentRules = config.get<string>('rules', '');
        if (currentRules.includes(LHUB_RULES_MARKER)) {
            const markerIdx = currentRules.indexOf(LHUB_RULES_MARKER);
            const cleaned = currentRules.substring(0, markerIdx).trimEnd();
            // M1 fix: await the Promise so cleanup completes before deactivation exits
            await config.update('rules', cleaned || undefined, vscode.ConfigurationTarget.Global);
            console.log('[L-Hub] Removed routing rules from geminicodeassist.rules ✅');
        }
    } catch (e) { console.error('[L-Hub] cleanup: routing rules error', e); }
}

export async function deactivate() {
    // Stop timers and servers
    if (statusRefreshTimer) {
        clearInterval(statusRefreshTimer);
        statusRefreshTimer = undefined;
    }
    if (mcpServer) {
        mcpServer.stop();
    }

    // Fix #4: Skip cleanup on normal IDE close — only clean on uninstall.
    // The cleanup removes MCP config, GEMINI.md injections, and routing rules,
    // but on next IDE launch activate() re-injects everything anyway.
    // Actual uninstall cleanup is handled by the extension uninstall hook.
}
