import * as vscode from 'vscode';

export interface BridgeConfig {
    defaultModel: string;
    retentionDays: number;
}

// Legacy fixed providers (for backward compat)
export const SUPPORTED_PROVIDERS = ['deepseek', 'glm', 'qwen', 'minimax'] as const;
export type Provider = typeof SUPPORTED_PROVIDERS[number];

// ─── v2: Dynamic ModelConfig ─────────────────────────────────────────────────

export interface ModelConfig {
    id: string;           // UUID
    modelId: string;      // key in MODEL_REGISTRY, e.g. "deepseek-chat"
    label: string;        // display label
    baseUrl: string;      // API base URL
    tasks: string[];      // assigned task IDs
    enabled: boolean;
    priority: number;     // lower = higher priority among same-task models
}

export class SettingsManager {
    private secretStorage: vscode.SecretStorage;
    private static readonly MODELS_KEY = 'l-hub.models.v2';

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

    // ── Legacy API key methods (still used for mcp-server.js sync) ───────────
    public async saveApiKey(provider: string, apiKey: string): Promise<void> {
        await this.secretStorage.store(`apikey.${provider}`, apiKey);
    }

    public async getApiKey(provider: string): Promise<string | undefined> {
        return await this.secretStorage.get(`apikey.${provider}`);
    }

    public async getAllApiKeys(): Promise<Record<string, string>> {
        const keys: Record<string, string> = {};
        for (const provider of SUPPORTED_PROVIDERS) {
            const key = await this.getApiKey(provider);
            if (key) { keys[provider] = key; }
        }
        return keys;
    }

    // ── v2: ModelConfig list ─────────────────────────────────────────────────

    public async getModels(): Promise<ModelConfig[]> {
        const raw = await this.secretStorage.get(SettingsManager.MODELS_KEY);
        if (!raw) { return this.getDefaultModels(); }
        try { return JSON.parse(raw) as ModelConfig[]; }
        catch { return this.getDefaultModels(); }
    }

    public async saveModels(models: ModelConfig[]): Promise<void> {
        await this.secretStorage.store(SettingsManager.MODELS_KEY, JSON.stringify(models));
    }

    public async addModel(model: ModelConfig): Promise<void> {
        const models = await this.getModels();
        models.push(model);
        await this.saveModels(models);
    }

    public async updateModel(id: string, patch: Partial<ModelConfig>): Promise<void> {
        const models = await this.getModels();
        const idx = models.findIndex(m => m.id === id);
        if (idx !== -1) { models[idx] = { ...models[idx], ...patch }; }
        await this.saveModels(models);
    }

    public async removeModel(id: string): Promise<void> {
        const models = await this.getModels();
        await this.saveModels(models.filter(m => m.id !== id));
    }

    // ── Default starter models ──────────────────────────────────────────────

    private getDefaultModels(): ModelConfig[] {
        return [
            { id: 'default-deepseek', modelId: 'deepseek-chat', label: 'DeepSeek-V3 (推荐)', baseUrl: 'https://api.deepseek.com/v1', tasks: ['code_gen', 'code_review'], enabled: true, priority: 0 },
            { id: 'default-deepseek-r1', modelId: 'deepseek-reasoner', label: 'DeepSeek-R1 (推理)', baseUrl: 'https://api.deepseek.com/v1', tasks: ['math_reasoning'], enabled: true, priority: 0 },
            { id: 'default-glm', modelId: 'glm-5', label: 'GLM-5 (通用 API)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', tasks: ['architecture', 'agentic', 'tool_calling', 'long_context'], enabled: true, priority: 0 },
            { id: 'default-glm-coding', modelId: 'glm-4.7', label: 'GLM-4.7 (Coding Plan)', baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4', tasks: ['code_gen', 'code_review', 'agentic'], enabled: true, priority: 0 },
            { id: 'default-qwen', modelId: 'qwen-max', label: 'Qwen-Max (推荐)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', tasks: ['translation', 'documentation', 'tool_calling'], enabled: true, priority: 0 },
            { id: 'default-minimax', modelId: 'MiniMax-M2.5', label: 'MiniMax-M2.5', baseUrl: 'https://api.minimax.io/v1', tasks: ['ui_design', 'creative', 'long_context'], enabled: true, priority: 0 },
        ];
    }

    // ── General config ───────────────────────────────────────────────────────
    public getGeneralConfig(): BridgeConfig {
        const config = vscode.workspace.getConfiguration('l-hub');
        return {
            defaultModel: config.get<string>('defaultModel', 'deepseek'),
            retentionDays: config.get<number>('retentionDays', 30),
        };
    }
}
