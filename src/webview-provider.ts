import * as vscode from 'vscode';
import * as path from 'path';
import { HistoryStorage } from './storage';
import { SettingsManager } from './settings';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, storage: HistoryStorage, settings: SettingsManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'lhubDashboard',
            'L-Hub',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
                retainContextWhenHidden: true
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, storage, settings);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private storage: HistoryStorage, private settings: SettingsManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    // ── Legacy key management ─────────────────────────────────
                    case 'getApiKeys': {
                        const keys = await this.settings.getAllApiKeys();
                        this._panel.webview.postMessage({ command: 'loadApiKeys', data: keys });
                        break;
                    }
                    case 'saveApiKey': {
                        if (message.provider && message.key !== undefined) {
                            await this.settings.saveApiKey(message.provider, message.key);
                        }
                        break;
                    }

                    // ── v2 Model management ───────────────────────────────────
                    case 'getModelsV2': {
                        const models = await this.settings.getModels();
                        // collect per-model API keys
                        const apiKeys: Record<string, string> = {};
                        for (const m of models) {
                            const k = await this.settings.getApiKey(`model.${m.id}`);
                            if (k) { apiKeys[m.id] = k; }
                        }
                        this._panel.webview.postMessage({ command: 'loadModelsV2', models, apiKeys });
                        break;
                    }
                    case 'addModel': {
                        const { modelConfig, apiKey } = message;
                        await this.settings.addModel(modelConfig);
                        if (apiKey) {
                            await this.settings.saveApiKey(`model.${modelConfig.id}`, apiKey);
                        }
                        await this._syncModelsToFile();
                        // Re-send updated list
                        const models = await this.settings.getModels();
                        const apiKeys: Record<string, string> = {};
                        for (const m of models) {
                            const k = await this.settings.getApiKey(`model.${m.id}`);
                            if (k) { apiKeys[m.id] = k; }
                        }
                        this._panel.webview.postMessage({ command: 'loadModelsV2', models, apiKeys });
                        break;
                    }
                    case 'removeModel': {
                        await this.settings.removeModel(message.id);
                        await this._syncModelsToFile();
                        const models = await this.settings.getModels();
                        const apiKeys: Record<string, string> = {};
                        for (const m of models) {
                            const k = await this.settings.getApiKey(`model.${m.id}`);
                            if (k) { apiKeys[m.id] = k; }
                        }
                        this._panel.webview.postMessage({ command: 'loadModelsV2', models, apiKeys });
                        break;
                    }
                    case 'updateModel': {
                        await this.settings.updateModel(message.id, message.patch);
                        if (message.apiKey !== undefined) {
                            await this.settings.saveApiKey(`model.${message.id}`, message.apiKey);
                        }
                        await this._syncModelsToFile();
                        const models = await this.settings.getModels();
                        const apiKeys: Record<string, string> = {};
                        for (const m of models) {
                            const k = await this.settings.getApiKey(`model.${m.id}`);
                            if (k) { apiKeys[m.id] = k; }
                        }
                        this._panel.webview.postMessage({ command: 'loadModelsV2', models, apiKeys });
                        break;
                    }
                    // ── Backend-proxied connection test (bypasses CORS) ───────
                    case 'testConnection': {
                        const { modelId, baseUrl, apiKey, requestId } = message;
                        try {
                            const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
                            const body = JSON.stringify({
                                model: modelId,
                                messages: [{ role: 'user', content: 'Reply with one word: OK' }],
                                max_tokens: 10,
                            });
                            const res = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                                body,
                                signal: AbortSignal.timeout(15000),
                            });
                            const json = await res.json() as any;
                            if (res.ok) {
                                const content = json?.choices?.[0]?.message?.content;
                                const msg = content ? content.replace(/<think>[\s\S]*?<\/think>/g, '').trim().substring(0, 20) || '已连通' : '已连通';
                                this._panel.webview.postMessage({ command: 'testResult', requestId, ok: true, msg });
                            } else {
                                const err = json?.error?.message || json?.message || json?.msg || `HTTP ${res.status}`;
                                this._panel.webview.postMessage({ command: 'testResult', requestId, ok: false, msg: (err as string).substring(0, 70) });
                            }
                        } catch (e: any) {
                            const msg = e.message?.includes('timeout') ? '超时 15s' : (e.message || 'Error').substring(0, 60);
                            this._panel.webview.postMessage({ command: 'testResult', requestId, ok: false, msg });
                        }
                        break;
                    }


                    case 'getHistory': {
                        const page = message.page || 1;
                        const pageSize = message.pageSize || 50;
                        const data = this.storage.queryHistory(page, pageSize);
                        this._panel.webview.postMessage({ command: 'loadHistory', data });
                        break;
                    }

                    // ── Open external URL ─────────────────────────────────────
                    case 'openUrl': {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        break;
                    }
                    // ── Codex CLI status ──────────────────────────────────────
                    case 'getCodexStatus': {
                        const { spawnSync } = require('child_process');
                        const ver = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 5000 });
                        if (ver.error) {
                            this._panel.webview.postMessage({ command: 'codexStatus', installed: false, loggedIn: false });
                            break;
                        }
                        // Try a lightweight env check to see if login token exists
                        const envCheck = spawnSync('codex', ['--help'], { encoding: 'utf8', timeout: 5000 });
                        const version = (ver.stdout || '').trim();
                        this._panel.webview.postMessage({ command: 'codexStatus', installed: true, version, loggedIn: envCheck.status === 0 });
                        break;
                    }
                    // ── Open terminal with command ────────────────────────────
                    case 'openTerminalWithCmd': {
                        const terminal = vscode.window.createTerminal('L-Hub Setup');
                        terminal.show();
                        terminal.sendText(message.cmd);
                        break;
                    }
                }
            },
            null,
            this._disposables
        );
    }

    /** Sync full model config (with API keys) to ~/.l-hub-keys.json */
    private async _syncModelsToFile() {
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const keysFile = path.join(os.homedir(), '.l-hub-keys.json');
        try {
            const models = await this.settings.getModels();
            const enriched = [];
            for (const m of models) {
                const k = await this.settings.getApiKey(`model.${m.id}`);
                enriched.push({ ...m, apiKey: k || '' });
            }
            // Also keep legacy keys for backward compat
            const legacy = await this.settings.getAllApiKeys();
            fs.writeFileSync(keysFile, JSON.stringify({ version: 2, models: enriched, legacy }, null, 2), 'utf8');
        } catch (e) {
            console.error('[L-Hub] Failed to sync models to file:', e);
        }
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) { x.dispose(); }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>L-Hub</title>
                <style>
                    body {
                        padding: 0;
                        margin: 0;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    #root {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
