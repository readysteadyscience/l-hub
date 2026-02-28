import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { HistoryStorage } from './storage';
import { SettingsManager, SUPPORTED_PROVIDERS } from './settings';
import { LinglanMcpServer } from './ws-server';
import { DashboardPanel } from './webview-provider';

let mcpServer: LinglanMcpServer;

const KEYS_FILE = path.join(os.homedir(), '.l-hub-keys.json');

/**
 * Export API keys from VS Code SecretStorage to ~/.l-hub-keys.json
 * so the standalone mcp-server.js can read them without vscode dependency.
 */
async function syncKeysToFile(settings: SettingsManager) {
    try {
        const keys: Record<string, string> = {};
        for (const provider of SUPPORTED_PROVIDERS) {
            const k = await settings.getApiKey(provider);
            if (k) keys[provider] = k;
        }
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
    } catch (e) {
        console.error('[L-Hub] Failed to sync keys:', e);
    }
}

/**
 * Auto-register the standalone mcp-server.js into Antigravity's mcp_config.json.
 * Idempotent — safe to call on every activation.
 */
function autoRegisterMcpConfig(extensionPath: string) {
    const serverPath = path.join(extensionPath, 'dist', 'mcp-server.js');
    const mcpConfigPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');

    if (!fs.existsSync(mcpConfigPath)) return; // Antigravity not installed

    try {
        const raw = fs.readFileSync(mcpConfigPath, 'utf8');
        const config = JSON.parse(raw);
        if (!config.mcpServers) config.mcpServers = {};

        const existing = config.mcpServers['l-hub'];
        const newEntry = { command: 'node', args: [serverPath], env: {} };

        if (!existing || existing.args?.[0] !== serverPath) {
            config.mcpServers['l-hub'] = newEntry;
            fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 4), 'utf8');
            console.log('[L-Hub] Auto-registered mcp-server.js in Antigravity mcp_config.json');
        }
    } catch (err) {
        console.error('[L-Hub] Failed to auto-register MCP config:', err);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('L-Hub extension is active!');

    const storagePath = context.globalStorageUri.fsPath;
    const storage = new HistoryStorage(storagePath);
    const settings = new SettingsManager(context);

    // Sync API keys to file so mcp-server.js can read them
    await syncKeysToFile(settings);

    // Auto-register standalone mcp-server.js into Antigravity config
    autoRegisterMcpConfig(context.extensionPath);

    // Register commands FIRST — before anything that could throw
    const openPanelCommand = vscode.commands.registerCommand('l-hub.openPanel', () => {
        DashboardPanel.createOrShow(context.extensionUri, storage, settings);
    });
    context.subscriptions.push(openPanelCommand);

    // Re-sync keys every time the Dashboard saves a key
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async () => {
            await syncKeysToFile(settings);
        })
    );

    // Start the WebSocket MCP server (non-critical — errors won't block activation)
    try {
        mcpServer = new LinglanMcpServer(storage, settings);
        await mcpServer.start();
    } catch (err) {
        console.error('[L-Hub] WS server failed to start (non-critical):', err);
    }
}

export function deactivate() {
    if (mcpServer) {
        mcpServer.stop();
    }
}
