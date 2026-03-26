import * as vscode from 'vscode';

export interface BridgeConfig {
    defaultModel: string;
    retentionDays: number;
}

export const SUPPORTED_PROVIDERS = ['deepseek', 'glm', 'qwen', 'minimax', 'kimi', 'gpt', 'gemini'] as const;
export type Provider = typeof SUPPORTED_PROVIDERS[number];

export interface ModelConfig {
    id: string;
    modelId: string;
    label: string;
    baseUrl: string;
    tasks: string[];
    enabled: boolean;
    priority: number;
}

export interface CreativeWritingConfig {
    outlineModels: string[];
    draftModels: string[];
    polishModel: string;
    evalModel: string;
}

export interface SettingsReader {
    getModels(): Promise<ModelConfig[]>;
    getApiKey(provider: string): Promise<string | undefined>;
}

export interface RequestRecord {
    id: string;
    timestamp: number;
    clientName: string;
    clientVersion: string;
    method: string;
    toolName?: string;
    model?: string;
    duration: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    requestPreview: string;
    responsePreview: string;
    status: 'success' | 'error';
    errorMessage?: string;
}

export interface HistoryStore {
    saveRecord(record: RequestRecord): void;
}

export class SettingsManager {
    private secretStorage: vscode.SecretStorage;
    private static readonly MODELS_KEY = 'l-hub.models.v2';

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

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

    public async getModelApiKey(modelConfigId: string): Promise<string | undefined> {
        return await this.secretStorage.get(`apikey.model.${modelConfigId}`);
    }

    public async getModels(): Promise<ModelConfig[]> {
        const raw = await this.secretStorage.get(SettingsManager.MODELS_KEY);
        if (!raw) { return this.getDefaultModels(); }
        try {
            const models = JSON.parse(raw) as ModelConfig[];
            const urlMigrations: [string, string][] = [
                ['https://api.minimaxi.com/v1', 'https://api.minimax.io/v1'],
                ['https://api.minimax.chat/v1', 'https://api.minimax.io/v1'],
                ['https://api.minimaxi.io/v1', 'https://api.minimax.io/v1'],
            ];
            const modelIdMigrations: [string, string][] = [
                ['minimax-text-2.5', 'MiniMax-M2.5'],
                ['minimax-text-01', 'MiniMax-M2.5'],
            ];
            let dirty = false;
            for (const model of models) {
                for (const [from, to] of urlMigrations) {
                    if (model.baseUrl === from) {
                        model.baseUrl = to;
                        dirty = true;
                    }
                }
                for (const [from, to] of modelIdMigrations) {
                    if (model.modelId === from) {
                        model.modelId = to;
                        dirty = true;
                    }
                }
            }
            if (dirty) {
                await this.saveModels(models);
            }
            return models;
        } catch {
            return this.getDefaultModels();
        }
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
        const index = models.findIndex((model) => model.id === id);
        if (index !== -1) {
            models[index] = { ...models[index], ...patch };
        }
        await this.saveModels(models);
    }

    public async removeModel(id: string): Promise<void> {
        const models = await this.getModels();
        await this.saveModels(models.filter((model) => model.id !== id));
    }

    private static readonly CREATIVE_CHAIN_KEY = 'l-hub.creative_chain.v1';

    public async getCreativeChainConfig(): Promise<CreativeWritingConfig> {
        const raw = await this.secretStorage.get(SettingsManager.CREATIVE_CHAIN_KEY);
        if (!raw) {
            return {
                outlineModels: [],
                draftModels: [],
                polishModel: '',
                evalModel: '',
            };
        }
        try {
            return JSON.parse(raw) as CreativeWritingConfig;
        } catch {
            return {
                outlineModels: [],
                draftModels: [],
                polishModel: '',
                evalModel: '',
            };
        }
    }

    public async saveCreativeChainConfig(config: CreativeWritingConfig): Promise<void> {
        await this.secretStorage.store(SettingsManager.CREATIVE_CHAIN_KEY, JSON.stringify(config));
    }

    private getDefaultModels(): ModelConfig[] {
        return [];
    }

    public getGeneralConfig(): BridgeConfig {
        const config = vscode.workspace.getConfiguration('l-hub');
        return {
            defaultModel: config.get<string>('defaultModel', 'deepseek'),
            retentionDays: config.get<number>('retentionDays', 30),
        };
    }
}
