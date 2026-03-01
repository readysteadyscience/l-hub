#!/usr/bin/env node
/**
 * L-Hub Standalone MCP Server
 *
 * Runs as an independent Node.js process via stdio (no vscode dependency).
 * Reads API keys + model config from ~/.l-hub-keys.json (written by VS Code Extension).
 * Supports both v1 (legacy flat key map) and v2 (models array with tasks).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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
    legacy?: Record<string, string>;
}

function readConfig(): LHubConfig {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')) as LHubConfig;
        }
    } catch { /* file missing or malformed */ }
    return {};
}

// ─── Legacy fallback (v1 format) ─────────────────────────────────────────────

const LEGACY_PROVIDERS: Record<string, { url: string; model: string }> = {
    deepseek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    glm: { url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
    minimax: { url: 'https://api.minimax.chat/v1', model: 'MiniMax-M2.5' },
    kimi: { url: 'https://api.moonshot.cn/v1', model: 'kimi-k2-instruct' },
    openai: { url: 'https://api.openai.com/v1', model: 'gpt-5.1' },
    gpt: { url: 'https://api.openai.com/v1', model: 'gpt-5.3-codex' },
    claude: { url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
    gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.1-flash' },
    mistral: { url: 'https://api.mistral.ai/v1', model: 'mistral-large-latest' },
};

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
    for (const [taskId, keywords] of Object.entries(TASK_KEYWORDS)) {
        if (keywords.some(k => msg.includes(k))) {
            return taskId;
        }
    }
    return 'code_gen'; // safe default
}

interface RouteResult {
    label: string;
    apiKey: string;
    baseUrl: string;
    modelId: string;
}

function resolveRoute(message: string, config: LHubConfig, forcedProvider?: string): RouteResult | null {
    const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);

    if (enabledModels.length > 0) {
        // v2: use user's configured models
        let chosen: ModelConfig | undefined;

        if (forcedProvider) {
            // Match by label, modelId, or partial model group name
            const fp = forcedProvider.toLowerCase();
            chosen = enabledModels.find(m =>
                m.modelId.toLowerCase().includes(fp) ||
                m.label.toLowerCase().includes(fp)
            );
        }

        if (!chosen) {
            const taskType = detectTaskType(message);
            const matching = enabledModels
                .filter(m => m.tasks.includes(taskType))
                .sort((a, b) => a.priority - b.priority);
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

    // v1 legacy fallback
    const legacy: Record<string, string> = config.legacy || (config as any);
    let providerKey = forcedProvider || 'deepseek';

    if (!forcedProvider) {
        const msg = message.toLowerCase();
        if (msg.includes('architecture') || msg.includes('架构') || msg.includes('agentic')) { providerKey = 'glm'; }
        else if (msg.includes('translate') || msg.includes('翻译') || msg.includes('中文')) { providerKey = 'qwen'; }
        else if (msg.includes('terminal') || msg.includes('devops') || msg.includes('shell')) { providerKey = 'gpt'; }
        else if (msg.includes('reasoning') || msg.includes('推理') || msg.includes('algorithm')) { providerKey = 'gemini'; }
    }

    const legacyKey = legacy[providerKey];
    if (!legacyKey) { return null; }

    const prov = LEGACY_PROVIDERS[providerKey];
    if (!prov) { return null; }

    return {
        label: providerKey,
        apiKey: legacyKey,
        baseUrl: prov.url,
        modelId: prov.model,
    };
}

// ─── API Call ─────────────────────────────────────────────────────────────────

async function callProvider(route: RouteResult, message: string, systemPrompt?: string) {
    const url = route.baseUrl.endsWith('/chat/completions')
        ? route.baseUrl
        : `${route.baseUrl}/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) { messages.push({ role: 'system', content: systemPrompt }); }
    messages.push({ role: 'user', content: message });

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${route.apiKey}`,
        },
        body: JSON.stringify({ model: route.modelId, messages, temperature: 0.7 }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${route.label} API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json() as any;
    return {
        text: (data.choices?.[0]?.message?.content as string) || 'No response',
        inputTokens: (data.usage?.prompt_tokens as number) || 0,
        outputTokens: (data.usage?.completion_tokens as number) || 0,
    };
}

// ─── Codex CLI ────────────────────────────────────────────────────────────────

function callCodex(task: string, workingDir?: string): string {
    const cwd = workingDir || process.cwd();
    const result = spawnSync(
        'codex',
        ['exec', '--skip-git-repo-check', '--full-auto', task],
        { cwd, encoding: 'utf8', timeout: 300_000 }
    );
    if (result.error) {
        const err = result.error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
            throw new Error('Codex CLI not found. Install: npm install -g @openai/codex, then: codex login');
        }
        throw new Error(`Codex CLI error: ${err.message}`);
    }
    if (result.status !== 0 && !result.stdout?.trim()) {
        throw new Error(result.stderr?.trim() || `Codex exited with code ${result.status}`);
    }
    return result.stdout?.trim() || '(Codex completed with no output)';
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

async function main() {
    const server = new Server(
        { name: 'l-hub', version: '0.1.0' },
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
        ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const config = readConfig();

        // ── ai_list_providers ─────────────────────────────────────────────
        if (request.params.name === 'ai_list_providers') {
            const enabledModels = (config.models || []).filter(m => m.enabled && m.apiKey);
            const codexCheck = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 5000 });
            const codexStatus = codexCheck.error
                ? '❌ Not installed (run: npm install -g @openai/codex)'
                : '✅ Ready (uses ChatGPT login)';

            if (enabledModels.length > 0) {
                const lines = enabledModels.map(m =>
                    `✅ ${m.label} (${m.modelId}) — tasks: ${m.tasks.join(', ') || 'none'}`
                );
                return {
                    content: [{ type: 'text', text: `Configured models:\n${lines.join('\n')}\n\n🤖 Codex CLI: ${codexStatus}` }],
                };
            }

            // v1 fallback
            const legacy: Record<string, string> = config.legacy || (config as any);
            const configured = Object.keys(LEGACY_PROVIDERS).filter(p => !!legacy[p]);
            const missing = Object.keys(LEGACY_PROVIDERS).filter(p => !legacy[p]);
            return {
                content: [{
                    type: 'text',
                    text: `✅ Configured: ${configured.join(', ') || 'none'}\n❌ Missing key: ${missing.join(', ') || 'none'}\n🤖 Codex CLI: ${codexStatus}\n\nTip: Open L-Hub Dashboard (Cmd+Shift+P → "L-Hub: Open Dashboard") to manage models.`,
                }],
            };
        }

        // ── ai_codex_task ─────────────────────────────────────────────────
        if (request.params.name === 'ai_codex_task') {
            const args = request.params.arguments as { task: string; working_dir?: string };
            if (!args?.task) {
                return { content: [{ type: 'text', text: 'Error: task is required' }], isError: true };
            }
            try {
                const result = callCodex(args.task, args.working_dir);
                return { content: [{ type: 'text', text: result }] };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                return { content: [{ type: 'text', text: `Codex error: ${msg}` }], isError: true };
            }
        }

        // ── ai_ask ────────────────────────────────────────────────────────
        if (request.params.name === 'ai_ask') {
            const args = request.params.arguments as { message: string; provider?: string; system_prompt?: string };
            if (!args?.message) {
                return { content: [{ type: 'text', text: 'Error: message is required' }], isError: true };
            }

            const route = resolveRoute(args.message, config, args.provider);
            if (!route) {
                return {
                    content: [{
                        type: 'text',
                        text: `❌ No configured model found${args.provider ? ` for provider "${args.provider}"` : ''}.\n\nPlease open L-Hub Dashboard (Cmd+Shift+P → "L-Hub: Open Dashboard") and add a model with an API key.`,
                    }],
                    isError: true,
                };
            }

            try {
                const result = await callProvider(route, args.message, args.system_prompt);
                return { content: [{ type: 'text', text: result.text }] };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                return { content: [{ type: 'text', text: `Error calling ${route.label}: ${msg}` }], isError: true };
            }
        }

        return {
            content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
            isError: true,
        };
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`L-Hub MCP server fatal error: ${msg}\n`);
    process.exit(1);
});
