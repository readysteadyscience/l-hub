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
    console.log('[L-Hub] Activating...');

    const settings = new SettingsManager(context);

    // ── STEP 1: Register commands immediately — BEFORE anything that could throw ──
    let storage: HistoryStorage | null = null;

    const openPanelCommand = vscode.commands.registerCommand('l-hub.openPanel', () => {
        if (!storage) {
            vscode.window.showWarningMessage(
                'L-Hub: History storage is unavailable (SQLite load failed). Settings panel will still work.',
            );
        }
        DashboardPanel.createOrShow(context.extensionUri, storage!, settings);
    });
    context.subscriptions.push(openPanelCommand);

    console.log('[L-Hub] Command l-hub.openPanel registered ✅');

    // ── STEP 2: Initialize history storage (may fail if better-sqlite3 ABI mismatch) ──
    try {
        const storagePath = context.globalStorageUri.fsPath;
        storage = new HistoryStorage(storagePath);
        console.log('[L-Hub] HistoryStorage initialized ✅');
    } catch (err) {
        console.error('[L-Hub] HistoryStorage failed to init (SQLite ABI issue?), history will be disabled:', err);
    }

    // ── STEP 3: Sync keys + auto-register MCP config ──
    await syncKeysToFile(settings);
    autoRegisterMcpConfig(context.extensionPath);

    // ── STEP 4: Start WebSocket server (non-critical) ──
    try {
        mcpServer = new LinglanMcpServer(storage!, settings);
        await mcpServer.start();
        console.log('[L-Hub] WS MCP server started ✅');
    } catch (err) {
        console.error('[L-Hub] WS server failed to start (non-critical):', err);
    }
}

export function deactivate() {
    if (mcpServer) {
        mcpServer.stop();
    }
}
