/**
 * ACA v2 — Git Pre-Commit Code Review Runner
 * 
 * Standalone Node process invoked by the pre-commit hook.
 * Reads available reviewers from L-Hub config and runs code review
 * on the staged git diff using a cascading priority chain:
 * 
 *   Priority 1: Codex CLI (free, ChatGPT subscription)
 *   Priority 2: Gemini CLI (free, local credentials)
 *   Priority 3: Any enabled Cloud models from L-Hub config
 * 
 * Exit code 0 = pass (commit allowed)
 * Exit code 1 = issues found (commit blocked)
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Types ──────────────────────────────────────────────────────────────────

interface ReviewResult {
    reviewer: string;
    risk: 'SAFE' | 'WARNING' | 'CRITICAL';
    summary: string;
    details?: string;
}

interface LHubConfig {
    version?: number;
    models?: Array<{
        id: string;
        modelId: string;
        label: string;
        baseUrl: string;
        enabled: boolean;
        apiKey?: string;
        priority?: number;
    }>;
}

// ── Config ─────────────────────────────────────────────────────────────────

const KEYS_FILE = path.join(os.homedir(), '.l-hub-keys.json');
const REPORT_FILE = path.join(os.tmpdir(), 'l-hub-aca-report.json');
const MAX_DIFF_CHARS = 8000; // Limit diff size to avoid token overflow

const REVIEW_PROMPT = `You are a senior code reviewer. Analyze the following git diff and identify:
1. Potential bugs or logic errors
2. Security vulnerabilities
3. Performance issues
4. Breaking changes or regressions

IMPORTANT: Be concise. Only flag genuine issues, not style preferences.
If the code looks fine, simply say "LGTM - No issues found."

Respond in this exact format:
RISK: [SAFE|WARNING|CRITICAL]
SUMMARY: [one-line summary]
DETAILS: [bullet points of issues, or "None"]

Git diff:
`;

// ── Reviewer Detection ─────────────────────────────────────────────────────

function isCodexAvailable(): boolean {
    const result = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 5000, shell: true });
    return !result.error && result.status === 0;
}

function isGeminiAvailable(): boolean {
    const result = spawnSync('gemini', ['--version'], { encoding: 'utf8', timeout: 5000, shell: true });
    return !result.error && result.status === 0;
}

function getCloudModels(): NonNullable<LHubConfig['models']> {
    try {
        if (!fs.existsSync(KEYS_FILE)) return [];
        const config: LHubConfig = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        return (config.models || []).filter(m => m.enabled && m.apiKey);
    } catch {
        return [];
    }
}

// ── Review Engines ─────────────────────────────────────────────────────────

function reviewWithCodex(diff: string): ReviewResult {
    const prompt = REVIEW_PROMPT + diff;
    // Write prompt to a temp file to avoid shell escaping issues
    const tmpFile = path.join(os.tmpdir(), 'l-hub-aca-prompt.txt');
    fs.writeFileSync(tmpFile, prompt, 'utf8');
    const result = spawnSync('codex', ['exec', '--quiet', '-a', 'ask', '-f', tmpFile], {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
    });
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    if (result.error || result.status !== 0) {
        throw new Error(`Codex failed: ${result.stderr || result.error?.message}`);
    }
    return parseReviewOutput('Codex CLI', result.stdout);
}

function reviewWithGemini(diff: string): ReviewResult {
    const prompt = REVIEW_PROMPT + diff;
    // Use --prompt flag and pass prompt via stdin
    const result = spawnSync('gemini', ['--prompt', '-'], {
        encoding: 'utf8',
        timeout: 60000,
        input: prompt,
        maxBuffer: 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
        throw new Error(`Gemini CLI failed: ${result.stderr || result.error?.message}`);
    }
    return parseReviewOutput('Gemini CLI', result.stdout);
}

function reviewWithCloudModel(model: NonNullable<LHubConfig['models']>[0], diff: string): ReviewResult {
    const url = model.baseUrl.replace(/\/$/, '') + '/chat/completions';
    const body = JSON.stringify({
        model: model.modelId,
        messages: [{ role: 'user', content: REVIEW_PROMPT + diff }],
        max_tokens: 800,
        temperature: 0.1,
    });

    // Use curl since we're in a standalone Node process without native fetch in all versions
    const result = spawnSync('curl', [
        '-s', '-X', 'POST', url,
        '-H', 'Content-Type: application/json',
        '-H', `Authorization: Bearer ${model.apiKey}`,
        '-d', body,
        '--max-time', '30',
    ], { encoding: 'utf8', timeout: 35000 });

    if (result.error || result.status !== 0) {
        throw new Error(`API call to ${model.label} failed: ${result.stderr || result.error?.message}`);
    }

    try {
        const json = JSON.parse(result.stdout);
        const text = json.choices?.[0]?.message?.content || '';
        return parseReviewOutput(model.label, text);
    } catch {
        throw new Error(`Failed to parse response from ${model.label}`);
    }
}

// ── Output Parser ──────────────────────────────────────────────────────────

function parseReviewOutput(reviewer: string, output: string): ReviewResult {
    const text = output.trim();

    // Reject empty or trivially short output
    if (text.length < 5) {
        throw new Error(`Empty or trivially short response from ${reviewer}`);
    }
    
    // Try to extract structured RISK line
    const riskMatch = text.match(/RISK:\s*(SAFE|WARNING|CRITICAL)/i);
    const summaryMatch = text.match(/SUMMARY:\s*(.+)/i);
    const detailsMatch = text.match(/DETAILS:\s*([\s\S]*?)(?=$)/i);

    let risk: ReviewResult['risk'] = 'WARNING'; // Default to WARNING instead of SAFE for unstructured output
    if (riskMatch) {
        risk = riskMatch[1].toUpperCase() as ReviewResult['risk'];
    } else {
        // Infer risk from content
        const lower = text.toLowerCase();
        if (/(critical|severe|unsafe|high risk|严重|高危|backdoor|vulnerability|漏洞)/.test(lower)) {
            risk = 'CRITICAL';
        } else if (/(lgtm|no issues|looks good|looks fine|无问题|没有发现)/.test(lower)) {
            risk = 'SAFE';
        }
    }

    const summary = summaryMatch?.[1]?.trim() || (risk === 'SAFE' ? 'LGTM - No issues found.' : text.slice(0, 120));
    const details = detailsMatch?.[1]?.trim() || undefined;

    return { reviewer, risk, summary, details };
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
    // 1. Get staged diff
    const diffResult = spawnSync('git', ['diff', '--cached', '--no-color'], { encoding: 'utf8', timeout: 10000 });
    if (diffResult.error || !diffResult.stdout?.trim()) {
        // No diff or error — allow commit
        process.exit(0);
    }

    let diff = diffResult.stdout.trim();
    if (diff.length > MAX_DIFF_CHARS) {
        diff = diff.slice(0, MAX_DIFF_CHARS) + '\n\n[... diff truncated for review ...]';
    }

    // 2. Discover available reviewers
    const codexOk = isCodexAvailable();
    const geminiOk = isGeminiAvailable();
    const cloudModels = getCloudModels();

    const availableCount = (codexOk ? 1 : 0) + (geminiOk ? 1 : 0) + cloudModels.length;
    if (availableCount === 0) {
        console.log('🔍 ACA: 没有可用的审查员，跳过审查。');
        process.exit(0);
    }

    console.log(`🔍 ACA: 发现 ${availableCount} 个可用审查员，正在审查暂存区代码...`);

    // 3. Run reviews with cascade
    const results: ReviewResult[] = [];

    // Priority 1: Codex CLI
    if (codexOk) {
        try {
            console.log('  → Codex CLI 审查中...');
            results.push(reviewWithCodex(diff));
        } catch (e: any) {
            console.log(`  ⚠ Codex CLI 失败: ${e.message}`);
        }
    }

    // Priority 2: Gemini CLI
    if (geminiOk) {
        try {
            console.log('  → Gemini CLI 审查中...');
            results.push(reviewWithGemini(diff));
        } catch (e: any) {
            console.log(`  ⚠ Gemini CLI 失败: ${e.message}`);
        }
    }

    // Priority 3: Cloud models (use first available, or up to 2 for consensus)
    const maxCloud = results.length === 0 ? 2 : 1; // Use more cloud models if CLI all failed
    for (let i = 0; i < Math.min(cloudModels.length, maxCloud); i++) {
        try {
            console.log(`  → ${cloudModels[i].label} 审查中...`);
            results.push(reviewWithCloudModel(cloudModels[i], diff));
        } catch (e: any) {
            console.log(`  ⚠ ${cloudModels[i].label} 失败: ${e.message}`);
        }
    }

    if (results.length === 0) {
        console.log('⚠ ACA: 所有审查员均失败，放行 commit。');
        process.exit(0);
    }

    // 4. Determine overall verdict
    const hasCritical = results.some(r => r.risk === 'CRITICAL');
    const hasWarning = results.some(r => r.risk === 'WARNING');

    // Write report for IDE to pick up
    const report = {
        timestamp: Date.now(),
        results,
        verdict: hasCritical ? 'BLOCKED' : (hasWarning ? 'WARNING' : 'PASSED'),
    };
    try {
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    } catch { /* ignore */ }

    // 5. Output results
    console.log('');
    console.log('━━━━━━━━━━━ ACA 审查报告 ━━━━━━━━━━━');
    for (const r of results) {
        const icon = r.risk === 'SAFE' ? '✅' : (r.risk === 'WARNING' ? '⚠️' : '🚨');
        console.log(`${icon} [${r.reviewer}] ${r.risk}: ${r.summary}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (hasCritical) {
        console.log('');
        console.log('🚫 COMMIT BLOCKED — 发现严重问题，请修复后重新提交。');
        console.log('   提示: 使用 git commit --no-verify 可以强制跳过审查。');
        process.exit(1);
    }

    if (hasWarning) {
        console.log('');
        console.log('⚠️  发现潜在问题，但 commit 仍然放行。请留意上述提醒。');
    } else {
        console.log('');
        console.log('✅ LGTM — 审查通过，commit 放行。');
    }

    process.exit(0);
}

main();
