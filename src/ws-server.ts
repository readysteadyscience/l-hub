import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { WebSocketServer } from 'ws';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HistoryStorage } from './storage';
import { SettingsManager, Provider, ModelConfig } from './settings';

class WsTransport implements Transport {
    public onclose?: () => void;
    public onerror?: (error: Error) => void;
    public onmessage?: (message: JSONRPCMessage) => void;

    constructor(private ws: import('ws').WebSocket) {
        ws.on('message', (message: Buffer) => {
            try {
                const reqStr = message.toString('utf8');
                const req = JSON.parse(reqStr);
                this.onmessage?.(req);
            } catch (e) {
                console.error('WsTransport parse error:', e);
            }
        });
        ws.on('close', () => this.onclose?.());
        ws.on('error', (err: Error) => this.onerror?.(err));
    }

    async start() {}

    async close() {
        this.ws.close();
    }

    async send(message: JSONRPCMessage) {
        this.ws.send(JSON.stringify(message) + '\n');
    }
}

export class LinglanMcpServer {
    private httpServer: http.Server;
    private wss: WebSocketServer;
    private portFile = path.join(os.homedir(), '.l-hub.port');

    constructor(
        private storage: HistoryStorage | null,
        private settings: SettingsManager
    ) {
        this.httpServer = http.createServer();
        this.wss = new WebSocketServer({ server: this.httpServer });

        this.wss.on('connection', (ws) => {
            const transport = new WsTransport(ws);
            const mcpServer = new Server({
                name: "l-hub",
                version: "0.0.1"
            }, {
                capabilities: {
                    tools: {}
                }
            });

            mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
                return {
                    tools: [
                        {
                            name: "ai_ask",
                            description: "Ask a single question to an AI provider. Route complex architecture queries to GLM, general coding to DeepSeek, translation to Qwen, UI/design to MiniMax.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    provider: {
                                        type: "string",
                                        description: "The AI provider/group alias to use (e.g. 'deepseek', 'glm', 'qwen', 'minimax'). If omitted, defaults to deepseek."
                                    },
                                    message: {
                                        type: "string",
                                        description: "The question or prompt for the AI."
                                    },
                                    system_prompt: {
                                        type: "string",
                                        description: "Optional system instructions."
                                    }
                                },
                                required: ["message"]
                            }
                        },
                        {
                            name: "ai_multi_ask",
                            description: "Ask multiple AI models the same question in parallel and compare their responses. Best for getting diverse perspectives or Creative Writing chains.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    providers: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "List of provider aliases to query (e.g. ['deepseek', 'glm', 'qwen', 'minimax']). Ohmit to query all available."
                                    },
                                    message: {
                                        type: "string",
                                        description: "The question or prompt."
                                    },
                                    system_prompt: {
                                        type: "string",
                                        description: "Optional system instructions."
                                    }
                                },
                                required: ["message"]
                            }
                        }
                    ]
                };
            });

            mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
                const reqStr = JSON.stringify(request);
                const startTime = Date.now();
                let resultText = '';
                let status: 'success' | 'error' = 'success';
                let usedModel = 'unknown';
                let inputTokens = 0;
                let outputTokens = 0;

                try {
                    if (request.params.name === "ai_ask") {
                        const args = request.params.arguments as { provider?: string, message: string, system_prompt?: string };
                        let targetRoute = args.provider || 'deepseek';
                        
                        const resolvedModel = await this.resolveModel(targetRoute);
                        if (!resolvedModel) {
                            throw new Error(`Could not find an enabled, configured model for route: ${targetRoute}`);
                        }
                        usedModel = resolvedModel.model.label || resolvedModel.model.modelId;

                        const apiResponse = await this.callAIProvider(resolvedModel, args.message, args.system_prompt);
                        resultText = apiResponse.text;
                        inputTokens = apiResponse.inputTokens;
                        outputTokens = apiResponse.outputTokens;

                        const response = {
                            content: [{ type: "text", text: resultText }],
                            isError: false
                        };

                        this.logTransaction(request.params.name, usedModel, startTime, reqStr, JSON.stringify(response), 'success', inputTokens, outputTokens);
                        return response;
                    } 
                    else if (request.params.name === "ai_multi_ask") {
                        const args = request.params.arguments as { providers?: string[], message: string, system_prompt?: string };
                        const targets = args.providers && args.providers.length > 0 
                            ? args.providers 
                            : ['deepseek', 'glm', 'qwen']; // Defaults if none provided

                        // Map targets to actual models concurrently
                        const resolvedPromises = targets.map(t => this.resolveModel(t));
                        const resolvedResults = await Promise.all(resolvedPromises);
                        const validModels = resolvedResults.filter((r): r is { model: ModelConfig; apiKey: string; } => r !== null);
                        
                        if (validModels.length === 0) {
                            throw new Error(`Could not find any enabled, configured models for the requested targets: ${targets.join(', ')}`);
                        }

                        usedModel = `Multi-Ask (${validModels.map(m => m.model.label).join(', ')})`;

                        // Execute API calls concurrently
                        const apiPromises = validModels.map(rm => this.callAIProvider(rm, args.message, args.system_prompt).then(res => ({
                            label: rm.model.label,
                            res
                        })).catch(err => ({
                            label: rm.model.label,
                            error: err.message
                        })));

                        const results = await Promise.all(apiPromises);

                        // Format output
                        resultText = results.map(r => {
                            if ('error' in r) {
                                return `### ❌ [${r.label}] 失败\n${r.error}\n`;
                            } else {
                                inputTokens += r.res.inputTokens;
                                outputTokens += r.res.outputTokens;
                                return `### ✅ [${r.label}]\n${r.res.text}\n`;
                            }
                        }).join('\n---\n\n');

                        const response = {
                            content: [{ type: "text", text: resultText }],
                            isError: false
                        };

                        this.logTransaction(request.params.name, usedModel, startTime, reqStr, JSON.stringify(response), 'success', inputTokens, outputTokens);
                        return response;
                    }
                    throw new Error(`Unknown tool: ${request.params.name}`);
                } catch (e: any) {
                    status = 'error';
                    const errorMsg = e.message;
                    resultText = `Error: ${e.message}`;
                    this.logTransaction(request.params.name, usedModel, startTime, reqStr, resultText, 'error', 0, 0, errorMsg);
                    return {
                        content: [{ type: "text", text: resultText }],
                        isError: true
                    };
                }
            });

            mcpServer.connect(transport);
        });
    }

    private logTransaction(toolName: string, model: string, startTime: number, reqStr: string, resStr: string, status: 'success' | 'error', inputTokens: number, outputTokens: number, errorMsg?: string) {
        // M2 fix: guard against null storage
        if (!this.storage) { return; }
        this.storage.saveRecord({
            // L1 fix: add random suffix to avoid millisecond ID collision
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: startTime,
            clientName: 'Antigravity Client',
            clientVersion: '1.0',
            method: 'tools/call',
            toolName: toolName,
            model: model,
            duration: Date.now() - startTime,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            requestPreview: reqStr.substring(0, 1000),
            responsePreview: resStr.substring(0, 1000),
            status,
            errorMessage: errorMsg
        });
    }

    /** Resolves a routing target alias (e.g. 'deepseek', 'glm', 'miniMax') to the highest priority, configured ModelConfig. */
    private async resolveModel(targetStr: string): Promise<{ model: ModelConfig, apiKey: string } | null> {
        const models = await this.settings.getModels();
        // Filter out disabled ones and CLI wrappers (we only proxy pure API models in L-Hub)
        const candidates = models.filter(m => m.enabled !== false && !m.modelId.includes('CLI'));
        
        // Sort by priority -> descending priority
        candidates.sort((a, b) => a.priority - b.priority);

        const lowerTarget = targetStr.toLowerCase();
        
        for (const c of candidates) {
            // Check if exact match by config ID, modelID, or label
            if (c.id === targetStr || c.modelId === targetStr || c.label === targetStr) {
                 const apiKey = await this.settings.getApiKey(`model.${c.id}`);
                 if (apiKey) return { model: c, apiKey };
            }
        }
        
        // Strategy 2: Check by general provider grouping words 
        // Example: target='glm', matches modelId='glm-5' or label='GLM-5'
        for (const c of candidates) {
             const mLower = c.modelId.toLowerCase();
             const lLower = c.label.toLowerCase();
             if (mLower.includes(lowerTarget) || lLower.includes(lowerTarget) ||
                (targetStr === 'glm' && (mLower.includes('zhipu') || lLower.includes('智谱')))
             ) {
                 const apiKey = await this.settings.getApiKey(`model.${c.id}`);
                 if (apiKey) return { model: c, apiKey };
             }
        }

        return null; // None found or none had API keys configured
    }

    private async callAIProvider(resolved: { model: ModelConfig, apiKey: string }, message: string, systemPrompt?: string) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: message });

        // Build generic OpenAI style request
        let url = resolved.model.baseUrl.replace(/\/$/, '') + '/chat/completions';
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resolved.apiKey}`
        };

        const body = JSON.stringify({
            model: resolved.model.modelId,
            messages,
            temperature: 0.7
        });

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body
        });

        if (!res.ok) {
            const errStr = await res.text();
            throw new Error(`API error from ${resolved.model.label}: ${res.status} ${errStr}`);
        }

        const data = await res.json() as any;
        return {
            text: data.choices?.[0]?.message?.content || 'No response',
            inputTokens: data.usage?.prompt_tokens || 0,
            outputTokens: data.usage?.completion_tokens || 0
        };
    }

    public async start() {
        return new Promise<void>((resolve) => {
            this.httpServer.listen(0, '127.0.0.1', () => {
                const addr = this.httpServer.address();
                if (addr && typeof addr !== 'string') {
                    fs.writeFileSync(this.portFile, addr.port.toString(), 'utf8');
                    console.log(`L-Hub MCP running on port ${addr.port}`);
                }
                resolve();
            });
        });
    }

    public stop() {
        if (fs.existsSync(this.portFile)) {
            fs.unlinkSync(this.portFile);
        }
        this.wss.close();
        this.httpServer.close();
    }
}
