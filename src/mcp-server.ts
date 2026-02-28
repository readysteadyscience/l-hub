#!/usr/bin/env node
/**
 * L-Hub Standalone MCP Server
 * 
 * Runs as an independent Node.js process via stdio (no vscode dependency).
 * Reads API keys from ~/.l-hub-keys.json (written by the VS Code Extension UI).
 * Auto-registers itself in ~/.gemini/antigravity/mcp_config.json at first run.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ─── Key Store ────────────────────────────────────────────────────────────────
const KEYS_FILE = path.join(os.homedir(), '.l-hub-keys.json');

function readKeys(): Record<string, string> {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        }
    } catch { }
    return {};
}

// ─── Provider Config ──────────────────────────────────────────────────────────
const PROVIDERS: Record<string, { url: string; model: string }> = {
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    glm: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-max' },
    minimax: { url: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'abab6.5-chat' },
};

// ─── Codex CLI ──────────────────────────────────────────────────────────────────────
function callCodex(task: string, workingDir?: string): string {
    const cwd = workingDir || process.cwd();
    const result = spawnSync(
        'codex',
        ['exec', '--skip-git-repo-check', '--full-auto', task],
        { cwd, encoding: 'utf8', timeout: 300_000 }
    );
    if (result.error) {
        if ((result.error as any).code === 'ENOENT') {
            throw new Error('Codex CLI not found. Install with: npm install -g @openai/codex, then run: codex login');
        }
        throw new Error(`Codex CLI error: ${result.error.message}`);
    }
    if (result.status !== 0 && !result.stdout?.trim()) {
        throw new Error(result.stderr?.trim() || `Codex exited with code ${result.status}`);
    }
    return result.stdout?.trim() || '(no output)';
}

// ─── Smart Router ─────────────────────────────────────────────────────────────
function smartRoute(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('architecture') || msg.includes('架构') || msg.includes('design pattern')) return 'glm';
    if (msg.includes('translate') || msg.includes('翻译')) return 'qwen';
    if (msg.includes('ui') || msg.includes('frontend') || msg.includes('前端') || msg.includes('css')) return 'minimax';
    return 'deepseek';
}

// ─── API Call ─────────────────────────────────────────────────────────────────
async function callProvider(provider: string, apiKey: string, message: string, systemPrompt?: string) {
    const cfg = PROVIDERS[provider];
    if (!cfg) throw new Error(`Unknown provider: ${provider}`);

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });

    const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: cfg.model, messages, temperature: 0.7 }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${provider} API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json() as any;
    return {
        text: data.choices?.[0]?.message?.content || 'No response',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const server = new Server(
        { name: 'l-hub', version: '0.0.9' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: 'ai_ask',
                description: 'Ask a question to a specialized AI expert model. L-Hub auto-routes to the best model: DeepSeek (code/general), GLM (architecture/engineering), Qwen (translation/multilingual), MiniMax (UI/frontend). Or specify a provider directly.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The question or task for the AI model.' },
                        provider: { type: 'string', enum: ['deepseek', 'glm', 'qwen', 'minimax'], description: 'Force a specific provider. Omit for smart auto-routing.' },
                        system_prompt: { type: 'string', description: 'Optional system-level instructions.' },
                    },
                    required: ['message'],
                },
            },
            {
                name: 'ai_list_providers',
                description: 'List which AI providers are currently configured (have API keys set).',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'ai_codex_task',
                description: 'Run an autonomous coding task using Codex CLI. Codex can read/write local files and execute terminal commands — no API key needed, uses your ChatGPT account login (run: codex login). Best for: full-file rewrites, code review, refactoring whole directories.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        task: { type: 'string', description: 'Task description for Codex to complete autonomously.' },
                        working_dir: { type: 'string', description: 'Working directory. Defaults to current directory.' },
                    },
                    required: ['task'],
                },
            },
        ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const keys = readKeys();

        if (request.params.name === 'ai_list_providers') {
            const configured = Object.keys(PROVIDERS).filter(p => !!keys[p]);
            const unconfigured = Object.keys(PROVIDERS).filter(p => !keys[p]);
            // Check Codex CLI availability
            const codexCheck = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 5000 });
            const codexStatus = codexCheck.error ? '❌ Not installed (run: npm install -g @openai/codex)' : '✅ Ready (uses ChatGPT login)';
            return {
                content: [{
                    type: 'text',
                    text: `✅ Configured: ${configured.join(', ') || 'none'}\n❌ Missing API key: ${unconfigured.join(', ') || 'none'}\n🤖 Codex CLI: ${codexStatus}\n\nConfigure API keys via: L-Hub Dashboard (Cmd+Shift+P → "L-Hub: Open Dashboard")`,
                }],
            };
        }

        if (request.params.name === 'ai_codex_task') {
            const args = request.params.arguments as { task: string; working_dir?: string };
            if (!args.task) {
                return { content: [{ type: 'text', text: 'Error: task is required' }], isError: true };
            }
            try {
                const result = callCodex(args.task, args.working_dir);
                return { content: [{ type: 'text', text: result }], isError: false };
            } catch (e: any) {
                return { content: [{ type: 'text', text: `Codex error: ${e.message}` }], isError: true };
            }
        }

        if (request.params.name === 'ai_ask') {
            const args = request.params.arguments as { message: string; provider?: string; system_prompt?: string };
            const provider = args.provider || smartRoute(args.message);
            const apiKey = keys[provider];

            if (!apiKey) {
                return {
                    content: [{
                        type: 'text',
                        text: `❌ API key for "${provider}" is not configured.\n\nPlease open L-Hub Dashboard (Cmd+Shift+P → "L-Hub: Open Dashboard") and add your ${provider} API key.`,
                    }],
                    isError: true,
                };
            }

            try {
                const result = await callProvider(provider, apiKey, args.message, args.system_prompt);
                return {
                    content: [{ type: 'text', text: result.text }],
                    isError: false,
                };
            } catch (e: any) {
                return {
                    content: [{ type: 'text', text: `Error calling ${provider}: ${e.message}` }],
                    isError: true,
                };
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

main().catch((e) => {
    process.stderr.write(`L-Hub MCP server fatal error: ${e.message}\n`);
    process.exit(1);
});
