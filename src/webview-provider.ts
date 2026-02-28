import * as vscode from 'vscode';
import * as path from 'path';
import { HistoryStorage } from './storage';
import { SettingsManager, Provider } from './settings';

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
                    case 'getApiKeys': {
                        const keys = await this.settings.getAllApiKeys();
                        this._panel.webview.postMessage({ command: 'loadApiKeys', data: keys });
                        break;
                    }
                    case 'saveApiKey': {
                        if (message.provider && message.key !== undefined) {
                            await this.settings.saveApiKey(message.provider as Provider, message.key);
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
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
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
