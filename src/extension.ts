import * as vscode from 'vscode';
import * as path from 'path';
import { HistoryStorage } from './storage';
import { SettingsManager } from './settings';
import { LinglanMcpServer } from './ws-server';
import { DashboardPanel } from './webview-provider';

let mcpServer: LinglanMcpServer;

export async function activate(context: vscode.ExtensionContext) {
    console.log('L-Hub extension is active!');

    const storagePath = context.globalStorageUri.fsPath;
    const storage = new HistoryStorage(storagePath);
    const settings = new SettingsManager(context);

    mcpServer = new LinglanMcpServer(storage, settings);
    await mcpServer.start();

    let openPanelCommand = vscode.commands.registerCommand('l-hub.openPanel', () => {
        DashboardPanel.createOrShow(context.extensionUri, storage, settings);
    });

    context.subscriptions.push(openPanelCommand);
}

export function deactivate() {
    if (mcpServer) {
        mcpServer.stop();
    }
}
