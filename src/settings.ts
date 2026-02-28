import * as vscode from 'vscode';

export interface BridgeConfig {
    defaultModel: string;
    retentionDays: number;
}

export const SUPPORTED_PROVIDERS = ['deepseek', 'glm', 'qwen', 'minimax'] as const;
export type Provider = typeof SUPPORTED_PROVIDERS[number];

export class SettingsManager {
    private secretStorage: vscode.SecretStorage;

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

    public async saveApiKey(provider: Provider, apiKey: string): Promise<void> {
        await this.secretStorage.store(`apikey.${provider}`, apiKey);
    }

    public async getApiKey(provider: Provider): Promise<string | undefined> {
        return await this.secretStorage.get(`apikey.${provider}`);
    }

    public async getAllApiKeys(): Promise<Record<string, string>> {
        const keys: Record<string, string> = {};
        for (const provider of SUPPORTED_PROVIDERS) {
            const key = await this.getApiKey(provider);
            if (key) {
                keys[provider] = key;
            }
        }
        return keys;
    }

    public getGeneralConfig(): BridgeConfig {
        const config = vscode.workspace.getConfiguration('l-hub');
        return {
            defaultModel: config.get<string>('defaultModel', 'deepseek'),
            retentionDays: config.get<number>('retentionDays', 30)
        };
    }
}
