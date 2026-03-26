/**
 * L-Hub Auto-Accept Module
 * 
 * Automatically accepts agent-suggested terminal commands and file edits.
 * Strategy: Uses VS Code keyboard shortcut simulation to trigger accept actions.
 * 
 * Antigravity's agent panel runs in an isolated webview, so we use the
 * VS Code command API to simulate the keyboard shortcut that accepts changes.
 */

import * as vscode from 'vscode';

let intervalId: ReturnType<typeof setInterval> | undefined;
let isRunning = false;
let statusBarItem: vscode.StatusBarItem | undefined;
let consecutiveAttempts = 0;
const MAX_CONSECUTIVE = 200; // safety cap

export function isAutoAcceptActive(): boolean {
    return isRunning;
}

export function startAutoAccept(context: vscode.ExtensionContext) {
    if (isRunning) return;
    isRunning = true;
    consecutiveAttempts = 0;

    // Create status bar indicator
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        statusBarItem.command = 'l-hub.toggleAutoAccept';
        context.subscriptions.push(statusBarItem);
    }
    statusBarItem.text = '$(rocket) Auto-Accept ON';
    statusBarItem.tooltip = 'L-Hub Auto-Accept is active — click to disable';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();

    // Poll every 1.5s — try to accept pending changes
    intervalId = setInterval(async () => {
        if (consecutiveAttempts >= MAX_CONSECUTIVE) {
            stopAutoAccept();
            vscode.window.showWarningMessage(
                'L-Hub Auto-Accept: Reached safety limit. Stopped automatically.'
            );
            return;
        }
        consecutiveAttempts++;
        try {
            // Try common Antigravity accept commands
            // These are the internal commands Antigravity exposes
            await vscode.commands.executeCommand('antigravity.agent.acceptPendingEdits').then(
                () => {},
                () => {} // silently fail if command doesn't exist
            );
        } catch {
            // Silently ignore — command may not exist or nothing to accept
        }
    }, 1500);

    vscode.window.showInformationMessage('🚀 Auto-Accept 已启用 — Agent 的修改将自动接受');
}

export function stopAutoAccept() {
    if (!isRunning) return;
    isRunning = false;

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
    }

    if (statusBarItem) {
        statusBarItem.text = '$(rocket) Auto-Accept OFF';
        statusBarItem.tooltip = 'L-Hub Auto-Accept is disabled — click to enable';
        statusBarItem.backgroundColor = undefined;
    }

    consecutiveAttempts = 0;
}

export function toggleAutoAccept(context: vscode.ExtensionContext) {
    if (isRunning) {
        stopAutoAccept();
        vscode.window.showInformationMessage('Auto-Accept 已关闭');
    } else {
        startAutoAccept(context);
    }
}

export function disposeAutoAccept() {
    stopAutoAccept();
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = undefined;
    }
}
