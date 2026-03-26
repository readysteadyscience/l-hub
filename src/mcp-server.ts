#!/usr/bin/env node
/**
 * L-Hub Standalone MCP Server
 *
 * Runs as an independent Node.js process via stdio (no vscode dependency).
 * Reads API keys + model config from ~/.l-hub-keys.json (written by Antigravity Extension).
 * Routing is based exclusively on the v2 `models` array.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ── Helper: Async Spawn Version Check ─────────────────────────────────────────
function checkCliVersion(command: string): Promise<{ installed: boolean; version: string }> {
    return new Promise((resolve) => {
        const child = spawn(command, ['--version'], { shell: true });
        let stdout = '';
        child.stdout?.on('data', (d) => { stdout += d.toString(); });
        child.on('error', () => resolve({ installed: false, version: '' }));
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ installed: true, version: stdout.trim() });
            } else {
                resolve({ installed: false, version: '' });
            }
        });
    });
}

// ── History DB (opened lazily, writes silently suppressed on error) ────────────────
let _historyDb: any = null;
function getHistoryDb(dbPath?: string): any {
    if (_historyDb) { return _historyDb; }
    if (!dbPath || !fs.existsSync(path.dirname(dbPath))) { return null; }
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Database = require('better-sqlite3');
        _historyDb = new Database(dbPath);
        _historyDb.exec(`CREATE TABLE IF NOT EXISTS request_history (
            id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL,
            client_name TEXT, client_version TEXT, method TEXT NOT NULL,
            tool_name TEXT, model TEXT, duration INTEGER,
            input_tokens INTEGER, output_tokens INTEGER, total_tokens INTEGER,
            request_preview TEXT, response_preview TEXT,
            status TEXT NOT NULL, error_message TEXT
        )`);
        return _historyDb;
    } catch { return null; }
}
function saveHistory(dbPath: string | undefined, rec: {
    model?: string; method: string; toolName?: string;
    duration: number; inputTokens?: number; outputTokens?: number;
    requestPreview: string; responsePreview: string;
    status: 'success' | 'error'; errorMessage?: string;
}) {
    const db = getHistoryDb(dbPath);
    if (!db) { return; }
    try {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        db.prepare(`INSERT OR IGNORE INTO request_history
            (id,timestamp,client_name,method,tool_name,model,duration,input_tokens,output_tokens,total_tokens,request_preview,response_preview,status,error_message)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(
            id, Date.now(), 'l-hub-mcp', rec.method, rec.toolName ?? rec.method,
            rec.model ?? null, rec.duration,
            rec.inputTokens ?? null, rec.outputTokens ?? null,
            (rec.inputTokens ?? 0) + (rec.outputTokens ?? 0) || null,
            rec.requestPreview.slice(0, 500), rec.responsePreview.slice(0, 500),
            rec.status, rec.errorMessage ?? null
        );
    } catch { /* never crash the server */ }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const KEYS_FILE = path.join(os.homedir(), '.l-hub-keys.json');

interface ModelConfig {
    id: string;
    modelId: string;
    label: string;
    baseUrl: string;
    tasks: string[];
    enabled: boolean;
    priority: number;
    apiKey?: string;
}

interface LHubConfig {
    version?: number;
    models?: ModelConfig[];
    dbPath?: string;
    pipelineLogic?: string;
    pipelineWriter?: string;
}

function readConfig(): LHubConfig {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')) as LHubConfig;
        }
    } catch { /* file missing or malformed */ }
    return {};
}

// ─── L-Hub Routing Philosophy ──────────────────────────────────────────────────
// L-Hub supplements Antigravity (Claude Sonnet 4.6), it does NOT replace it.
// → Do NOT route tasks to Claude here: Claude is already the orchestrator doing
//   complex reasoning, architecture analysis, and long-context work natively.
// → L-Hub's value: specialized models for cost-efficient domain tasks, local
//   CLI tools (Codex, Gemini CLI), and Chinese-ecosystem models.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Smart routing ────────────────────────────────────────────────────────────

const TASK_KEYWORDS: Record<string, string[]> = {
    code_gen: ['code', 'write function', 'implement', 'snippet', '代码', '编写', '实现'],
    code_review: ['review', 'debug', 'fix bug', 'refactor', 'lint', '审查', '调试', '重构'],
    architecture: ['architecture', 'design pattern', 'system design', 'diagram', '架构', '设计'],
    documentation: ['document', 'comment', 'readme', 'explain', '注释', '文档'],
    translation: ['translate', 'translation', 'localize', '翻译', '本地化'],
    ui_design: ['ui', 'frontend', 'css', 'component', 'layout', '前端', '组件', '样式'],
    long_context: ['summarize', 'long document', 'file content', '长文本', '总结'],
    math_reasoning: ['math', 'equation', 'calculate', 'proof', 'algorithm', '数学', '计算', '推理'],
    tool_calling: ['function call', 'api integration', 'tool use'],
    creative: ['write story', 'essay', 'creative', '创意', '写作'],
    agentic: ['agent', 'automate', 'autonomous task', '自动化'],
};

function detectTaskType(message: string): string {
    const msg = message.toLowerCase();

    // ── Length-aware routing (takes priority over keywords) ───────────────
    if (message.length > 3000) {
        return 'long_context';
    }
    if (message.length < 100 && (msg.includes('code') || msg.includes('代码') || msg.includes('function') || msg.includes('函数'))) {
        return 'code_gen';
    }

    // ── Weighted keyword matching (multi-word phrases score higher) ───────
    let bestTask = 'code_gen';
    let bestScore = 0;
    for (const [taskId, keywords] of Object.entries(TASK_KEYWORDS)) {
        let score = 0;
        for (const k of keywords) {
            if (msg.includes(k)) {
                // Multi-word keywords are more specific → higher weight
                score += k.includes(' ') ? 2 : 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestTask = taskId;
        }
    }
    return bestTask;
}

interface RouteResult {
    label: string;
    apiKey: string;
    baseUrl: string;
    modelId: string;
}

export interface ConsensusAuditOptions {
    criteria?: string;
    providers?: string[];
    judge?: string;
    systemPrompt?: string;
    filePaths?: string[];
}

export interface ConsensusAuditResult {
    ok: boolean;
    mode: 'winner' | 'fallback' | 'error';
    criteria: string;
    totalMs: number;
    judgeLabel?: string;
    candidateCount: number;
    text: string;
    candidates?: Array<{ label: string; text: string }>;
    error?: string;
}

function resolveRoute(message: string, config: LHubConfig, forcedProvider?: string): RouteResult | null {
    const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);
    if (enabledModels.length === 0) { return null; }

    let chosen: ModelConfig | undefined;

    if (forcedProvider) {
        // Match by configured model id, label, or upstream model id
        const fp = forcedProvider.toLowerCase();
        chosen = enabledModels.find(m =>
            m.id.toLowerCase() === fp ||
            m.id.toLowerCase().includes(fp) ||
            m.modelId.toLowerCase().includes(fp) ||
            m.label.toLowerCase().includes(fp)
        );
        
        // If explicitly requested but not configured/enabled, DO NOT silent fallback.
        if (!chosen) {
            return null;
        }
    } else {
        const taskType = detectTaskType(message);
        const matching = enabledModels
            .filter(m => m.tasks.includes(taskType))
            .sort((a, b) => b.priority - a.priority);
        chosen = matching[0] || enabledModels[0];
    }

    if (!chosen) { return null; }

    return {
        label: chosen.label,
        apiKey: chosen.apiKey!,
        baseUrl: chosen.baseUrl.replace(/\/$/, ''),
        modelId: chosen.modelId,
    };
}

function resolveConsensusProviders(config: LHubConfig, requestedProviders?: string[]): string[] {
    const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);
    if (requestedProviders && requestedProviders.length > 0) {
        return requestedProviders;
    }
    return enabledModels.slice(0, 5).map(m => m.id);
}

function formatConsensusCandidates(candidates: Array<{ label: string; text: string }>): string {
    return candidates
        .map((candidate, index) => `### Candidate ${index + 1}: ${candidate.label}\n${candidate.text}`)
        .join('\n\n---\n\n');
}

function buildConsensusJudgePrompt(message: string, criteria: string, candidates: Array<{ label: string; text: string }>): string {
    const candidateBlock = candidates
        .map((candidate, index) => `=== Candidate ${index + 1} (${candidate.label}) ===\n${candidate.text}`)
        .join('\n\n');

    return `You are an expert judge. Evaluate the following ${candidates.length} candidate answers to the user's question.

User's Question: ${message}

Judging Criteria: ${criteria}

${candidateBlock}

=== Your Task ===
1. Score each candidate from 1-10 based on the criteria "${criteria}"
2. Explain your reasoning for each score in 1-2 sentences
3. Declare the winner
4. Output the winning answer in full

Format your response as:
SCORES:
- Candidate 1 (name): X/10 — reason
- Candidate 2 (name): X/10 — reason
...

WINNER: Candidate N (name)

BEST ANSWER:
[full winning answer here]`;
}

// ─── API Call ─────────────────────────────────────────────────────────────────

interface ProviderCallResult {
    ok: boolean;
    text: string;
    inputTokens: number;
    outputTokens: number;
    error?: string;
    retryable?: boolean;
}

function extractErrorDetails(err: unknown): string {
    if (err instanceof Error) {
        const maybeNodeErr = err as Error & { code?: string; cause?: unknown };
        const parts = [maybeNodeErr.message];

        if (typeof maybeNodeErr.code === 'string' && !parts.includes(maybeNodeErr.code)) {
            parts.push(maybeNodeErr.code);
        }

        const cause = maybeNodeErr.cause as { code?: string; message?: string } | undefined;
        if (typeof cause?.code === 'string' && !parts.includes(cause.code)) {
            parts.push(cause.code);
        }
        if (typeof cause?.message === 'string' && cause.message !== maybeNodeErr.message) {
            parts.push(cause.message);
        }

        return parts.filter(Boolean).join(' | ');
    }

    return String(err);
}

function buildProviderErrorResult(route: RouteResult, reason: string): ProviderCallResult {
    const trimmedReason = reason.trim();
    return {
        ok: false,
        text: `Error calling ${route.label}: ${trimmedReason}`,
        inputTokens: 0,
        outputTokens: 0,
        error: trimmedReason,
        retryable: isRetryableError(trimmedReason),
    };
}

async function callProvider(route: RouteResult, message: string, systemPrompt?: string): Promise<ProviderCallResult> {
    const url = route.baseUrl.endsWith('/chat/completions')
        ? route.baseUrl
        : `${route.baseUrl}/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) { messages.push({ role: 'system', content: systemPrompt }); }
    messages.push({ role: 'user', content: message });

    // ── Streaming mode: 15s first-byte timeout, no total timeout ─────────────
    // This fixes long-form creative writing timeouts: once the API starts
    // streaming, we collect chunks until done — no matter how long it takes.
    const controller = new AbortController();
    const firstByteTimer = setTimeout(() => controller.abort(), 15_000);
    let firstByteReceived = false;

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${route.apiKey}`,
            },
            body: JSON.stringify({ model: route.modelId, messages, temperature: 0.7, stream: true }),
            signal: controller.signal,
        });
    } catch (e: unknown) {
        clearTimeout(firstByteTimer);
        if (e instanceof Error && e.name === 'AbortError') {
            return buildProviderErrorResult(route, `${route.label} API timeout (15s — no response received)`);
        }
        return buildProviderErrorResult(route, extractErrorDetails(e));
    }

    if (!res.ok) {
        clearTimeout(firstByteTimer);
        const errText = await res.text();
        // Some providers return non-streaming error even in stream mode — handle gracefully
        return buildProviderErrorResult(route, `${route.label} API ${res.status}: ${errText.slice(0, 300)}`);
    }

    // ── Read SSE stream ───────────────────────────────────────────────────────
    const reader = res.body?.getReader();
    if (!reader) {
        clearTimeout(firstByteTimer);
        try {
            // Fallback: try reading as plain JSON (provider didn't stream)
            const data = await res.json() as any;
            return {
                ok: true,
                text: (data.choices?.[0]?.message?.content as string) || 'No response',
                inputTokens: (data.usage?.prompt_tokens as number) || 0,
                outputTokens: (data.usage?.completion_tokens as number) || 0,
            };
        } catch (e: unknown) {
            return buildProviderErrorResult(route, `Invalid non-streaming response: ${extractErrorDetails(e)}`);
        }
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();

            // Cancel first-byte timer once data starts flowing
            if (!firstByteReceived && value && value.length > 0) {
                firstByteReceived = true;
                clearTimeout(firstByteTimer);
            }

            if (done) { break; }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') { continue; }
                if (!trimmed.startsWith('data: ')) { continue; }
                try {
                    const json = JSON.parse(trimmed.slice(6)) as any;
                    const delta = json.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string') { fullText += delta; }
                    // Capture token usage (usually in last chunk)
                    if (json.usage) {
                        inputTokens = json.usage.prompt_tokens || 0;
                        outputTokens = json.usage.completion_tokens || 0;
                    }
                } catch { /* skip malformed SSE line */ }
            }
        }
    } catch (e: unknown) {
        return buildProviderErrorResult(route, `Stream read failed: ${extractErrorDetails(e)}`);
    } finally {
        reader.releaseLock();
        clearTimeout(firstByteTimer);
    }

    return {
        ok: true,
        text: fullText || 'No response',
        inputTokens,
        outputTokens,
    };
}


// ─── Auto Fallback Retry Chain ───────────────────────────────────────────────

/**
 * Determines if an error is retryable (network issues, rate limits, server errors).
 * Non-retryable: auth errors (401/403), bad requests (400), unknown providers.
 */
function isRetryableError(msg: string): boolean {
    return (
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('fetch failed') ||
        msg.includes('network') ||
        msg.includes('429') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504')
    );
}

/**
 * Call a provider with automatic fallback to other enabled models on retryable errors.
 * Returns { text, inputTokens, outputTokens, usedModel } where usedModel may differ from route.
 */
async function callProviderWithFallback(
    primaryRoute: RouteResult,
    message: string,
    systemPrompt: string | undefined,
    config: LHubConfig
): Promise<{ ok: boolean; text: string; inputTokens: number; outputTokens: number; usedModel: string; didFallback: boolean; error?: string }> {
    // Build fallback queue: primary first, then other enabled models sorted by priority
    const enabledModels = (config.models || [])
        .filter(m => m.enabled && m.apiKey && m.modelId !== primaryRoute.modelId)
        .sort((a, b) => b.priority - a.priority);

    const fallbackRoutes: RouteResult[] = enabledModels.slice(0, 3).map(m => ({
        label: m.label,
        apiKey: m.apiKey!,
        baseUrl: m.baseUrl.replace(/\/$/, ''),
        modelId: m.modelId,
    }));

    const attemptQueue = [primaryRoute, ...fallbackRoutes];
    const errors: string[] = [];

    for (let i = 0; i < attemptQueue.length; i++) {
        const route = attemptQueue[i];
        const result = await callProvider(route, message, systemPrompt);
        if (result.ok) {
            return {
                ...result,
                usedModel: route.modelId,
                didFallback: i > 0,
            };
        }

        const msg = result.error || result.text;
        errors.push(`[${route.label}] ${msg}`);

        // Only retry on retryable errors
        if (!result.retryable) {
            return {
                ok: false,
                text: result.text,
                inputTokens: 0,
                outputTokens: 0,
                usedModel: route.modelId,
                didFallback: i > 0,
                error: msg,
            };
        }
        // else: continue to next model in queue
    }

    // All models failed
    const errorText = `All models failed:\n${errors.join('\n')}`;
    return {
        ok: false,
        text: errorText,
        inputTokens: 0,
        outputTokens: 0,
        usedModel: primaryRoute.modelId,
        didFallback: attemptQueue.length > 1,
        error: errorText,
    };
}

// ─── File Context Injection ───────────────────────────────────────────────────

const MAX_FILE_BYTES = 200 * 1024;      // 200 KB per file
const MAX_TOTAL_BYTES = 1024 * 1024;    // 1 MB total

/**
 * Reads a list of file paths and formats their contents as a context block
 * to be prepended to the system prompt.
 */
function buildFileContext(filePaths: string[]): { context: string; warnings: string[] } {
    const sections: string[] = [];
    const warnings: string[] = [];
    let totalBytes = 0;

    const homeDir = os.homedir();

    for (const rawPath of filePaths) {
        try {
            // Resolve path (support ~ expansion and relative to home)
            const absPath = rawPath.startsWith('~')
                ? path.join(homeDir, rawPath.slice(1))
                : path.resolve(rawPath);

            // Security: basic traversal sanity (no ../../ tricks after resolve)
            const normalized = path.normalize(absPath);

            if (!fs.existsSync(normalized)) {
                warnings.push(`File not found: ${rawPath}`);
                continue;
            }

            const stat = fs.statSync(normalized);
            if (!stat.isFile()) {
                warnings.push(`Not a file: ${rawPath}`);
                continue;
            }
            if (stat.size > MAX_FILE_BYTES) {
                warnings.push(`Skipped (too large, >${MAX_FILE_BYTES / 1024}KB): ${rawPath}`);
                continue;
            }

            totalBytes += stat.size;
            if (totalBytes > MAX_TOTAL_BYTES) {
                warnings.push(`Stopped reading files: total size limit (${MAX_TOTAL_BYTES / 1024}KB) exceeded`);
                break;
            }

            const content = fs.readFileSync(normalized, 'utf8');
            const displayName = path.basename(normalized);

            sections.push(`=== FILE: ${displayName} ===\n${content.trimEnd()}\n=== END FILE ===`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            warnings.push(`Error reading ${rawPath}: ${msg}`);
        }
    }

    return {
        context: sections.length > 0
            ? `The following file(s) have been provided as context:\n\n${sections.join('\n\n')}`
            : '',
        warnings,
    };
}

// ─── Codex CLI ────────────────────────────────────────────────────────────────

async function callCodex(task: string, working_dir?: string): Promise<string> {
    const cwd = working_dir || process.cwd();
    return new Promise<string>((resolve, reject) => {
        const child = spawn(
            'codex',
            ['--model', 'gpt-5.4', 'exec', '--skip-git-repo-check', '--full-auto', task],
            { cwd, env: process.env, shell: process.platform === 'win32' }
        );
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Codex CLI timed out after 5 minutes')); }, 300_000);
        child.on('error', (err: NodeJS.ErrnoException) => {
            clearTimeout(timer);
            if (err.code === 'ENOENT') { reject(new Error('Codex CLI not found. Install: npm install -g @openai/codex, then: codex login')); }
            else { reject(new Error(`Codex CLI error: ${err.message}`)); }
        });
        child.on('close', (code: number) => {
            clearTimeout(timer);
            if (code !== 0 && !stdout.trim()) { reject(new Error(stderr.trim() || `Codex exited with code ${code}`)); }
            else { resolve(stdout.trim() || '(Codex completed with no output)'); }
        });
    });
}

// ─── Gemini CLI ───────────────────────────────────────────────────────────────

/**
 * Call the local Gemini CLI in non-interactive mode via -p flag.
 * Strips ANSI escape codes from output.
 */
async function callGemini(prompt: string, model?: string, working_dir?: string): Promise<string> {
    const cwd = working_dir || process.cwd();
    const args: string[] = ['-p', prompt, '--yolo'];
    if (model) { args.push('-m', model); }

    return new Promise<string>((resolve, reject) => {
        const child = spawn('gemini', args, {
            cwd,
            env: { ...process.env },
            shell: process.platform === 'win32',
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Gemini CLI timed out after 5 minutes')); }, 300_000);
        child.on('error', (err: NodeJS.ErrnoException) => {
            clearTimeout(timer);
            if (err.code === 'ENOENT') { reject(new Error('Gemini CLI not found. Install: https://github.com/google-gemini/gemini-cli')); }
            else { reject(new Error(`Gemini CLI error: ${err.message}`)); }
        });
        child.on('close', (code: number) => {
            clearTimeout(timer);
            if (code !== 0 && !stdout.trim()) { reject(new Error(stderr.trim() || `Gemini CLI exited with code ${code}`)); }
            else {
                const raw = stdout.trim();
                // eslint-disable-next-line no-control-regex
                const clean = raw.replace(/\x1B\[[0-9;]*[a-zA-Z]|\x1B[@-_]/g, '');
                resolve(clean || '(Gemini completed with no output)');
            }
        });
    });
}


export async function executeConsensusAudit(
    codeDiff: string,
    options: ConsensusAuditOptions = {}
): Promise<ConsensusAuditResult> {
    const config = readConfig();
    const criteria = options.criteria || 'code_quality';

    let systemPrompt = options.systemPrompt;
    if (options.filePaths && options.filePaths.length > 0) {
        const { context } = buildFileContext(options.filePaths);
        if (context) {
            systemPrompt = systemPrompt ? `${systemPrompt}\n\n${context}` : context;
        }
    }

    const providerList = resolveConsensusProviders(config, options.providers);
    const dbPath = config.dbPath;
    const t0 = Date.now();

    const tasks = providerList.map(async (provider) => {
        const route = resolveRoute(codeDiff, config, provider);
        if (!route) {
            return { provider, label: provider, error: `No config for "${provider}"` };
        }

        const ts = Date.now();
        const result = await callProvider(route, codeDiff, systemPrompt);
        if (result.ok) {
            return { provider, label: route.label, text: result.text, duration: Date.now() - ts };
        }
        return { provider, label: route.label, error: result.error || result.text };
    });

    const rawResults = await Promise.allSettled(tasks);
    const candidates: Array<{ label: string; text: string }> = [];
    for (const result of rawResults) {
        if (result.status === 'fulfilled' && result.value.text) {
            candidates.push({ label: result.value.label, text: result.value.text });
        }
    }

    if (candidates.length === 0) {
        return {
            ok: false,
            mode: 'error',
            criteria,
            totalMs: Date.now() - t0,
            candidateCount: 0,
            text: 'Error: all candidate models failed to respond.',
            error: 'all candidate models failed to respond',
        };
    }

    if (candidates.length === 1) {
        return {
            ok: true,
            mode: 'winner',
            criteria,
            totalMs: Date.now() - t0,
            candidateCount: 1,
            text: `🏆 **ai_consensus** — Only 1 candidate responded\n\n**Winner: ${candidates[0].label}**\n\n${candidates[0].text}`,
            candidates,
        };
    }

    const judgeProvider = options.judge || providerList[0];
    const judgeRoute = resolveRoute(codeDiff, config, judgeProvider);
    if (!judgeRoute) {
        return {
            ok: true,
            mode: 'fallback',
            criteria,
            totalMs: Date.now() - t0,
            candidateCount: candidates.length,
            text: `🔀 **ai_consensus** — Judge unavailable, showing all candidates\n\n${formatConsensusCandidates(candidates)}`,
            candidates,
            error: 'judge unavailable',
        };
    }

    const judgePrompt = buildConsensusJudgePrompt(codeDiff, criteria, candidates);

    const judgeResult = await callProvider(judgeRoute, judgePrompt);
    if (!judgeResult.ok) {
        const msg = judgeResult.error || judgeResult.text;
        return {
            ok: true,
            mode: 'fallback',
            criteria,
            totalMs: Date.now() - t0,
            judgeLabel: judgeRoute.label,
            candidateCount: candidates.length,
            text: `⚠️ **ai_consensus** — Judge failed (${msg}), showing all candidates\n\n${formatConsensusCandidates(candidates)}`,
            candidates,
            error: msg,
        };
    }

    const totalMs = Date.now() - t0;

    saveHistory(dbPath, {
        method: 'ai_consensus',
        model: judgeRoute.modelId,
        duration: totalMs,
        inputTokens: judgeResult.inputTokens,
        outputTokens: judgeResult.outputTokens,
        requestPreview: codeDiff,
        responsePreview: judgeResult.text.slice(0, 200),
        status: 'success',
    });

    return {
        ok: true,
        mode: 'winner',
        criteria,
        totalMs,
        judgeLabel: judgeRoute.label,
        candidateCount: candidates.length,
        text: `🏆 **ai_consensus** — ${candidates.length} candidates | Judge: ${judgeRoute.label} | ${totalMs}ms\nCriteria: **${criteria}**\n\n${judgeResult.text}`,
        candidates,
    };
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

async function main() {
    const server = new Server(
        { name: 'lhub', version: '0.4.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: 'ai_ask',
                description: 'Ask a question to a specialized AI expert. L-Hub auto-routes to the best model based on your configured models and task types. Specify a provider to force a specific one.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The question or task.' },
                        provider: { type: 'string', description: 'Force a specific provider (e.g. "deepseek", "glm"). Omit for smart auto-routing.' },
                        system_prompt: { type: 'string', description: 'Optional system-level instructions.' },
                        file_paths: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Optional local file paths whose contents will be injected as context (max 200KB each, 1MB total). Supports absolute paths and ~ expansion.',
                        },
                    },
                    required: ['message'],
                },
            },
            {
                name: 'ai_list_providers',
                description: 'List configured AI models and their assigned task types.',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'ai_codex_task',
                description: 'Run an autonomous coding task using Codex CLI. Codex reads/writes local files and executes terminal commands — no API key needed, uses your ChatGPT account. Best for: file rewrites, code review, refactoring.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        task: { type: 'string', description: 'Task description for Codex.' },
                        working_dir: { type: 'string', description: 'Working directory. Defaults to current directory.' },
                    },
                    required: ['task'],
                },
            },
            {
                name: 'ai_gemini_task',
                description: 'Run an autonomous task using the local Gemini CLI (Google Gemini). Gemini has deep file/tool access via its built-in tools. Best for: reasoning tasks, code generation, file analysis, multi-step agentic workflows. Requires Gemini CLI installed (`npm i -g @google/gemini-cli`).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'The prompt / task to send to Gemini.' },
                        model: { type: 'string', description: 'Optional Gemini model to use (e.g. "gemini-3.1-pro"). Defaults to CLI default.' },
                        working_dir: { type: 'string', description: 'Working directory for Gemini CLI. Defaults to current directory.' },
                    },
                    required: ['prompt'],
                },
            },
            {
                name: 'ai_multi_ask',
                description: 'Ask multiple AI models the same question in parallel and compare their responses. Best for getting diverse perspectives, cross-validating answers, or finding the best response.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The question or task to send to all models.' },
                        providers: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of provider names to query in parallel (e.g. ["deepseek", "glm", "qwen"]). Omit to use all enabled models.',
                        },
                        system_prompt: { type: 'string', description: 'Optional system-level instructions for all models.' },
                        file_paths: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Optional local file paths whose contents will be injected as context.',
                        },
                    },
                    required: ['message'],
                },
            },
            {
                name: 'ai_consensus',
                description: 'Multi-model voting engine. Asks multiple models the same question, then uses a judge model to score and select the best answer based on preset criteria. Returns the winning answer with scores and reasoning.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The question or task to send to all models.' },
                        criteria: { type: 'string', description: 'Judging criteria: "code_quality", "creativity", "accuracy", "completeness", or custom description. Defaults to "accuracy".' },
                        providers: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of provider names to query. Omit to use all enabled models.',
                        },
                        judge: { type: 'string', description: 'Provider to use as judge. Omit to auto-select the strongest available model.' },
                        system_prompt: { type: 'string', description: 'Optional system-level instructions for candidate models.' },
                        file_paths: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Optional local file paths for context.',
                        },
                    },
                    required: ['message'],
                },
            },
            {
                name: 'ai_article_targeted_write',
                description: 'Targeted writing pipeline. Takes a URL or topic, extracts hard facts using a logic model to build a blueprint, and then renders a high-quality 1000-word Markdown article using a creative model following exact L-Ink formatting rules.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        topic_url: { type: 'string', description: 'The absolute URL to parse as source material.' },
                        raw_material: { type: 'string', description: 'Raw text material if no URL is provided.' }
                    }
                }
            },
            {
                name: 'ai_article_batch_radar',
                description: "Batch creation pipeline. Searches the web (via RSS) for macroscopic news (e.g. 'today\\'s AI tech news'), filters out fluff to build a dispatch list of disruptive topics, and asynchronously directs a creative model to write independent full-length articles for each topic. Returns the packaged Markdown.",
                inputSchema: {
                    type: 'object',
                    properties: {
                        search_query: { type: 'string', description: 'The search term for Google News RSS (e.g., "AI Technology News").' }
                    },
                    required: ['search_query']
                }
            }
        ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const config = readConfig();

        // ── ai_list_providers ─────────────────────────────────────────────
        if (request.params.name === 'ai_list_providers') {
            const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);

            const codexCheck = await checkCliVersion('codex');
            const codexStatus = !codexCheck.installed
                ? '❌ Not installed (run: npm install -g @openai/codex)'
                : `✅ Installed (${codexCheck.version || 'uses ChatGPT login'})`;

            const geminiCheck = await checkCliVersion('gemini');
            let geminiStatus = '❌ Not installed (npm i -g @google/gemini-cli)';
            if (geminiCheck.installed) {
                // gemini-cli version string can sometimes have ANSI or multiline
                const out = geminiCheck.version.split('\n')[0].replace(/\x1B\[[0-9;]*[a-zA-Z]|\x1B[@-_]/g, '').trim();
                geminiStatus = `✅ Installed (Auto local credentials)`;
            }

            if (enabledModels.length > 0) {
                const lines = enabledModels.map(m =>
                    `✅ ${m.label} (${m.modelId}) — tasks: ${m.tasks.join(', ') || 'none'}`
                );
                return {
                    content: [{ type: 'text', text: `Configured models:\n${lines.join('\n')}\n\n🤖 Codex CLI: ${codexStatus}\n🔷 Gemini CLI: ${geminiStatus}` }],
                };
            }

            return {
                content: [{
                    type: 'text',
                    text: `⚠️ No models configured.\n\n🤖 Codex CLI: ${codexStatus}\n🔷 Gemini CLI: ${geminiStatus}\n\nTip: Open L-Hub Dashboard (Cmd+Shift+P → "L-Hub: Open Dashboard") to add models.`,
                }],
            };
        }

        // ── ai_codex_task ─────────────────────────────────────────────────
        if (request.params.name === 'ai_codex_task') {
            const args = request.params.arguments as { task: string; working_dir?: string };
            if (!args?.task) {
                return { content: [{ type: 'text', text: 'Error: task is required' }], isError: true };
            }
            const t0 = Date.now();
            try {
                const result = await callCodex(args.task, args.working_dir);
                saveHistory(config.dbPath, {
                    method: 'ai_codex_task', model: 'codex-cli',
                    duration: Date.now() - t0,
                    requestPreview: args.task, responsePreview: result,
                    status: 'success',
                });
                return { content: [{ type: 'text', text: result }] };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                saveHistory(config.dbPath, {
                    method: 'ai_codex_task', model: 'codex-cli',
                    duration: Date.now() - t0,
                    requestPreview: args.task, responsePreview: msg,
                    status: 'error', errorMessage: msg,
                });
                return { content: [{ type: 'text', text: `Codex error: ${msg}` }], isError: true };
            }
        }

        // ── ai_gemini_task ────────────────────────────────────────────────
        if (request.params.name === 'ai_gemini_task') {
            const args = request.params.arguments as { prompt: string; model?: string; working_dir?: string };
            if (!args?.prompt) {
                return { content: [{ type: 'text', text: 'Error: prompt is required' }], isError: true };
            }
            const t0 = Date.now();
            try {
                const result = await callGemini(args.prompt, args.model, args.working_dir);
                saveHistory(config.dbPath, {
                    method: 'ai_gemini_task', model: args.model || 'gemini-cli',
                    duration: Date.now() - t0,
                    requestPreview: args.prompt, responsePreview: result,
                    status: 'success',
                });
                return { content: [{ type: 'text', text: result }] };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                saveHistory((config as any).dbPath, {
                    method: 'ai_gemini_task', model: args.model || 'gemini-cli',
                    duration: Date.now() - t0,
                    requestPreview: args.prompt, responsePreview: msg,
                    status: 'error', errorMessage: msg,
                });
                return { content: [{ type: 'text', text: `Gemini CLI error: ${msg}` }], isError: true };
            }
        }

        // ── ai_ask ────────────────────────────────────────────────────────
        if (request.params.name === 'ai_ask') {
            const args = request.params.arguments as {
                message: string;
                provider?: string;
                system_prompt?: string;
                file_paths?: string[];
            };
            if (!args?.message) {
                return { content: [{ type: 'text', text: 'Error: message is required' }], isError: true };
            }

            // Build system prompt with file context if provided
            let systemPrompt = args.system_prompt;
            const warningLines: string[] = [];
            if (args.file_paths && args.file_paths.length > 0) {
                const { context, warnings } = buildFileContext(args.file_paths);
                warningLines.push(...warnings);
                if (context) {
                    systemPrompt = systemPrompt ? `${systemPrompt}\n\n${context}` : context;
                }
            }

            const route = resolveRoute(args.message, config, args.provider);
            if (!route) {
                return {
                    content: [{
                        type: 'text',
                        text: `❌ No configured model found${args.provider ? ` for provider "${args.provider}"` : ''}.\\n\\nPlease open L-Hub Dashboard (Cmd+Shift+P → "L-Hub: Open Dashboard") and add a model with an API key.`,
                    }],
                    isError: true,
                };
            }

            const t0 = Date.now();
            try {
                const result = await callProviderWithFallback(route, args.message, systemPrompt, config);
                const fallbackNote = result.didFallback
                    ? `\n\n---\n⚡ *Auto-fallback: responded by **${result.usedModel}** (primary model unavailable)*`
                    : '';
                const warningNote = warningLines.length > 0
                    ? `\n\n> ⚠️ File context warnings: ${warningLines.join('; ')}`
                    : '';
                saveHistory(config.dbPath, {
                    method: 'ai_ask', model: result.usedModel,
                    duration: Date.now() - t0,
                    inputTokens: result.inputTokens, outputTokens: result.outputTokens,
                    requestPreview: args.message, responsePreview: result.text,
                    status: 'success',
                });
                return { content: [{ type: 'text', text: result.text + fallbackNote + warningNote }] };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                saveHistory(config.dbPath, {
                    method: 'ai_ask', model: route.modelId,
                    duration: Date.now() - t0,
                    requestPreview: args.message, responsePreview: msg,
                    status: 'error', errorMessage: msg,
                });
                return { content: [{ type: 'text', text: `Error calling ${route.label}: ${msg}` }], isError: true };
            }
        }

        // ── ai_multi_ask ──────────────────────────────────────────────────
        if (request.params.name === 'ai_multi_ask') {
            const args = request.params.arguments as {
                message: string;
                providers?: string[];
                system_prompt?: string;
                file_paths?: string[];
            };
            if (!args?.message) {
                return { content: [{ type: 'text', text: 'Error: message is required' }], isError: true };
            }

            // Build system prompt with file context if provided
            let systemPrompt = args.system_prompt;
            const warningLines: string[] = [];
            if (args.file_paths && args.file_paths.length > 0) {
                const { context, warnings } = buildFileContext(args.file_paths);
                warningLines.push(...warnings);
                if (context) {
                    systemPrompt = systemPrompt ? `${systemPrompt}\n\n${context}` : context;
                }
            }

            // Determine which providers to query
            const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);
            let providerList: string[];
            if (args.providers && args.providers.length > 0) {
                providerList = args.providers;
            } else if (enabledModels.length > 0) {
                // Use all enabled models (up to 5 to avoid overload)
                providerList = enabledModels.slice(0, 5).map(m => m.id);
            } else {
                providerList = ['deepseek', 'glm', 'qwen'];
            }

            const dbPath = (config as any).dbPath;

            // Run all in parallel
            const t0 = Date.now();
            const tasks = providerList.map(async (provider) => {
                const route = resolveRoute(args.message, config, provider);
                if (!route) return { provider, error: `No config for "${provider}"` };
                const ts = Date.now();
                try {
                    const result = await callProvider(route, args.message, systemPrompt);
                    saveHistory(dbPath, {
                        method: 'ai_multi_ask', model: route.modelId,
                        duration: Date.now() - ts,
                        inputTokens: result.inputTokens, outputTokens: result.outputTokens,
                        requestPreview: args.message, responsePreview: result.text,
                        status: 'success',
                    });
                    return { provider: route.label, text: result.text, duration: Date.now() - ts, tokens: (result.inputTokens || 0) + (result.outputTokens || 0) };
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    saveHistory(dbPath, {
                        method: 'ai_multi_ask', model: route.modelId,
                        duration: Date.now() - ts,
                        requestPreview: args.message, responsePreview: msg,
                        status: 'error', errorMessage: msg,
                    });
                    return { provider: route.label, error: msg };
                }
            });

            const results = await Promise.allSettled(tasks);
            const totalMs = Date.now() - t0;

            // Format comparison output
            const sections: string[] = [`🔀 **ai_multi_ask** — ${providerList.length} models | ${totalMs}ms total\n`];
            if (warningLines.length > 0) {
                sections.push(`> ⚠️ File context warnings: ${warningLines.join('; ')}\n`);
            }
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    const v = r.value;
                    if (v.error) {
                        sections.push(`---\n### ❌ ${v.provider}\n${v.error}`);
                    } else {
                        sections.push(`---\n### ✅ ${v.provider} (${v.duration}ms | ${v.tokens} tokens)\n${v.text}`);
                    }
                } else {
                    sections.push(`---\n### ❌ Error\n${r.reason}`);
                }
            }

            return { content: [{ type: 'text', text: sections.join('\n') }] };
        }

        // ── ai_consensus ─────────────────────────────────────────────────
        if (request.params.name === 'ai_consensus') {
            const args = request.params.arguments as {
                message: string;
                criteria?: string;
                providers?: string[];
                judge?: string;
                system_prompt?: string;
                file_paths?: string[];
            };
            if (!args?.message) {
                return { content: [{ type: 'text', text: 'Error: message is required' }], isError: true };
            }
            const result = await executeConsensusAudit(args.message, {
                criteria: args.criteria,
                providers: args.providers,
                judge: args.judge,
                systemPrompt: args.system_prompt,
                filePaths: args.file_paths,
            });

            if (!result.ok) {
                return { content: [{ type: 'text', text: result.text }], isError: true };
            }

            return { content: [{ type: 'text', text: result.text }] };
        }

        // ── ai_article_targeted_write ─────────────────────────────────────────────────
        if (request.params.name === 'ai_article_targeted_write') {
            const args = request.params.arguments as { topic_url?: string; raw_material?: string; };
            if (!args.topic_url && !args.raw_material) return { content: [{ type: 'text', text: 'Error: Provide topic_url or raw_material' }], isError: true };
            
            let sourceText = args.raw_material || '';
            if (args.topic_url) {
                sourceText = await fetchWebText(args.topic_url);
            }
            
            const a1Prompt = `[L-Ink Node A1: Blueprint Generation]\nExtract exactly 3-5 hard technical facts, pros/cons, and scenarios from this raw text. Output ONLY a highly structured Markdown Blueprint for an article. Raw text:\n\n${sourceText}`;
            const blueprint = await runPipelineNode('logic', a1Prompt, config);
            
            const a2Prompt = `[L-Ink Node A2: Deep Rendering]\nWrite a 1000-word highly engaging tech article based on this Blueprint.\nL-Ink Formatting Rules: Paragraphs MUST NOT exceed 3 lines. Use lists to isolate concepts. Use HTML span tags for blue text styling (<span style="color:#007AFF">金句</span>) at least twice. At the end, output a comparative Markdown table.\n\nBlueprint:\n${blueprint}`;
            const finalArticle = await runPipelineNode('creative', a2Prompt, config);
            
            return { content: [{ type: 'text', text: `### 🎯 Targeted Written Article\n\n${finalArticle}` }] };
        }

        // ── ai_article_batch_radar ─────────────────────────────────────────────────
        if (request.params.name === 'ai_article_batch_radar') {
            const args = request.params.arguments as { search_query: string; };
            if (!args.search_query) return { content: [{ type: 'text', text: 'Error: search_query is required' }], isError: true };
            
            const newsText = await fetchGoogleNews(args.search_query);
            
            const b1Prompt = `[L-Ink Node B1: Chief Editor]\nYou are the chief editor analyzing today's news feeds.\nFilter out PR fluff and pick the 2 to 3 most disruptive topics.\nOutput a valid JSON array and absolutely nothing else. Format: [{"topic":"Topic title","blueprint":"Detailed outline with 3 facts and pros/cons"}].\n\nNews feed:\n${newsText}`;
            const b1Response = await runPipelineNode('logic', b1Prompt, config);
            
            let topics: Array<{topic: string; blueprint: string}> = [];
            try {
                const jsonStr = b1Response.match(/\[[\s\S]*\]/)?.[0] || '[]';
                topics = JSON.parse(jsonStr);
            } catch (e) {
                return { content: [{ type: 'text', text: 'Failed to parse JSON from B1 node.' }], isError: true };
            }
            
            if (!topics || topics.length === 0) return { content: [{ type: 'text', text: 'No valid topics found from radar.' }] };
            
            const results = await Promise.all(topics.map(async (t) => {
                const a2Prompt = `[L-Ink Node B2: Deep Rendering]\nWrite a 1000-word highly engaging tech article based on this Blueprint. Topic: ${t.topic}\nL-Ink Formatting Rules: Paragraphs MUST NOT exceed 3 lines. Use lists to isolate concepts. Use HTML span tags for blue text styling (<span style="color:#007AFF">金句</span>) at least twice. At the end, output a comparative Markdown table.\n\nBlueprint:\n${t.blueprint}`;
                const text = await runPipelineNode('creative', a2Prompt, config);
                return `## ${t.topic}\n\n${text}`;
            }));
            
            return { content: [{ type: 'text', text: results.join('\n\n---\n\n') }] };
        }

        return {
            content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
            isError: true,
        };
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

// ─── Pipeline Helper Functions ────────────────────────────────────────────────

async function fetchWebText(url: string): Promise<string> {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
        return text.substring(0, 15000);
    } catch (e: any) {
        return `Failed to fetch URL: ${e.message}`;
    }
}

async function fetchGoogleNews(query: string): Promise<string> {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        const items = xml.split('<item>').slice(1).slice(0, 8);
        const results = items.map(item => {
            const title = (item.match(/<title>(.*?)<\/title>/) || [])[1] || 'No title';
            const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || 'No link';
            return `- ${title}\n  Link: ${link}`;
        });
        return results.join('\n\n');
    } catch (e: any) {
        return `Failed to fetch news: ${e.message}`;
    }
}

async function runPipelineNode(role: 'logic' | 'creative', prompt: string, config: LHubConfig): Promise<string> {
    const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);
    if (enabledModels.length === 0) return 'Error: No enabled models';

    const override = role === 'logic' ? config.pipelineLogic : config.pipelineWriter;
    let chosen: typeof enabledModels[0] | undefined;

    if (override && override !== 'auto' && override !== '') {
        chosen = enabledModels.find(m => m.modelId === override || m.label === override || m.id === override);
    }

    if (!chosen) {
        const targetType = role === 'logic' ? 'translation' : 'creative';
        let matching = enabledModels.filter(m => m.tasks.includes(targetType)).sort((a, b) => b.priority - a.priority);
        
        if (matching.length === 0 && role === 'logic') {
            matching = enabledModels.filter(m => m.tasks.includes('documentation') || m.tasks.includes('reasoning')).sort((a, b) => b.priority - a.priority);
        }
        chosen = matching[0] || enabledModels[0];
    }

    const route: RouteResult = {
        label: chosen.label,
        apiKey: chosen.apiKey!,
        baseUrl: chosen.baseUrl.replace(/\/$/, ''),
        modelId: chosen.modelId,
    };
    
    const result = await callProviderWithFallback(route, prompt, undefined, config);
    return result.text;
}

if (require.main === module) {
    main().catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`L-Hub MCP server fatal error: ${msg}\n`);
        process.exit(1);
    });
}
