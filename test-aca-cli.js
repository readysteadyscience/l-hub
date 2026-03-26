"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Module = require("module");
const vscodeMock = {
    workspace: {
        workspaceFolders: [],
        getConfiguration: () => ({
            get: (_, defaultValue) => defaultValue,
            update: async () => undefined,
            has: () => false,
            inspect: () => undefined,
        }),
        fs: {
            readFile: async () => new Uint8Array(),
            writeFile: async () => undefined,
            stat: async () => ({ type: 1, ctime: Date.now(), mtime: Date.now(), size: 0 }),
            createDirectory: async () => undefined,
        },
        onDidSaveTextDocument: () => ({ dispose: () => undefined }),
        onDidChangeConfiguration: () => ({ dispose: () => undefined }),
    },
    window: {
        showInformationMessage: async (...args) => args[1],
        showWarningMessage: async (...args) => args[1],
        showErrorMessage: async (...args) => args[1],
        createOutputChannel: () => ({
            appendLine: () => undefined,
            append: () => undefined,
            show: () => undefined,
            dispose: () => undefined,
        }),
        activeTextEditor: undefined,
    },
    commands: {
        registerCommand: () => ({ dispose: () => undefined }),
        executeCommand: async () => undefined,
    },
    Uri: {
        file: (fsPath) => ({ fsPath, path: fsPath, scheme: 'file', toString: () => fsPath }),
        parse: (value) => ({ fsPath: value, path: value, scheme: 'file', toString: () => value }),
    },
    ViewColumn: {
        One: 1,
    },
    env: {
        clipboard: {
            writeText: async () => undefined,
            readText: async () => '',
        },
    },
};
const moduleCtor = Module;
const originalLoad = moduleCtor._load;
moduleCtor._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') {
        return vscodeMock;
    }
    return originalLoad.call(this, request, parent, isMain);
};
const maliciousCode = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int login(const char *userInput) {
    char sql[2048];
    sprintf(sql, "SELECT * FROM users WHERE username = '%s' AND is_admin = 1;", userInput);
    printf("Executing SQL: %s\\n", sql);

    unsigned long long checksum = 0;
    for (unsigned long long i = 0; i < 999999999999999999ULL; ++i) {
        checksum += i;
    }

    while (1) {
        checksum ^= 0xDEADBEEF;
    }

    return (int)checksum;
}
`.trim();
async function main() {
    try {
        const { executeConsensusAudit } = require('./src/mcp-server');
        const out = await executeConsensusAudit(maliciousCode, {
            criteria: 'security vulnerabilities, exploitability, performance denial-of-service risk, and concrete remediation quality',
            providers: ['deepseek', 'glm', 'qwen'],
            judge: 'deepseek',
            systemPrompt: 'You are a security audit tribunal. Identify real vulnerabilities only, cite the exact dangerous patterns, and propose concrete fixes.',
        });
        console.log(JSON.stringify(out, null, 2));
    }
    finally {
        moduleCtor._load = originalLoad;
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exit(1);
});
