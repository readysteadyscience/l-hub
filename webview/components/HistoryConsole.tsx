import React, { useState, useEffect } from 'react';
import { vscode } from '../vscode-api';
import { VSCodeTag, VSCodeDivider } from '@vscode/webview-ui-toolkit/react';

interface RequestRecord {
    id: string;
    timestamp: number;
    clientName: string;
    method: string;
    duration: number;
    requestPreview: string;
    responsePreview: string;
    status: 'success' | 'error';
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    model?: string;
}

const HistoryConsole: React.FC = () => {
    const [records, setRecords] = useState<RequestRecord[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'loadHistory') {
                setRecords(message.data.records || []);
            }
        };
        window.addEventListener('message', handleMessage);

        const loadPage = () => vscode.postMessage({ command: 'getHistory', page: 1, pageSize: 50 });
        loadPage();

        // Auto refresh
        const timer = setInterval(loadPage, 3000);
        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(timer);
        };
    }, []);

    const selectedRecord = records.find(r => r.id === selectedId);

    return (
        <div style={{ display: 'flex', height: '100%', margin: '-20px', marginTop: 0 }}>
            <div style={{ width: '300px', borderRight: '1px solid var(--vscode-panel-border)', overflowY: 'auto', backgroundColor: 'var(--vscode-sideBar-background)' }}>
                {records.map(record => (
                    <div
                        key={record.id}
                        onClick={() => setSelectedId(record.id)}
                        style={{
                            padding: '12px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--vscode-panel-border)',
                            backgroundColor: selectedId === record.id ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                            color: selectedId === record.id ? 'var(--vscode-list-activeSelectionForeground)' : 'inherit'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginBottom: '4px' }}>
                            <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
                            <span style={{ color: record.status === 'success' ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)' }}>
                                {record.duration}ms
                            </span>
                        </div>
                        <div style={{ fontWeight: '500', fontSize: '13px', fontFamily: 'monospace', marginBottom: '4px' }}>{record.method}</div>
                        {(record.inputTokens || record.outputTokens) ? (
                            <div style={{ fontSize: '11px', color: 'var(--vscode-textPreformat-foreground)', opacity: 0.8 }}>
                                Tokens: {record.totalTokens || ((record.inputTokens || 0) + (record.outputTokens || 0))}
                            </div>
                        ) : null}
                    </div>
                ))}
                {records.length === 0 && <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No requests intercepted yet. Run Cline to see history here.</div>}
            </div>

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {selectedRecord ? (
                    <div style={{ maxWidth: '800px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '15px', fontFamily: 'monospace' }}>{selectedRecord.method}</h2>
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <VSCodeTag style={{ backgroundColor: selectedRecord.status === 'success' ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)' }}>
                                {selectedRecord.status.toUpperCase()}
                            </VSCodeTag>

                            {selectedRecord.model && selectedRecord.model !== 'unknown' && (
                                <VSCodeTag>{selectedRecord.model}</VSCodeTag>
                            )}

                            <VSCodeTag style={{ background: 'transparent', border: '1px solid var(--vscode-dropdown-border)', color: 'var(--vscode-foreground)' }}>
                                {selectedRecord.duration}ms
                            </VSCodeTag>

                            {(selectedRecord.inputTokens || selectedRecord.outputTokens) ? (
                                <VSCodeTag style={{ background: 'transparent', border: '1px solid var(--vscode-dropdown-border)', color: 'var(--vscode-foreground)' }}>
                                    Tokens: {selectedRecord.inputTokens || 0} ⬆ / {selectedRecord.outputTokens || 0} ⬇
                                </VSCodeTag>
                            ) : null}
                        </div>

                        <VSCodeDivider />

                        <h3 style={{ marginTop: '20px', color: 'var(--vscode-editor-foreground)', fontSize: '14px', fontWeight: 'bold' }}>Request JSON-RPC</h3>
                        <pre style={{ background: 'var(--vscode-textCodeBlock-background)', padding: '15px', borderRadius: '4px', overflowX: 'auto', fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'var(--vscode-editor-font-family)', border: '1px solid var(--vscode-panel-border)' }}>
                            {selectedRecord.requestPreview}
                        </pre>

                        <h3 style={{ marginTop: '30px', color: 'var(--vscode-editor-foreground)', fontSize: '14px', fontWeight: 'bold' }}>Response</h3>
                        <pre style={{ background: 'var(--vscode-textCodeBlock-background)', padding: '15px', borderRadius: '4px', overflowX: 'auto', fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'var(--vscode-editor-font-family)', border: '1px solid var(--vscode-panel-border)' }}>
                            {selectedRecord.responsePreview}
                        </pre>
                    </div>
                ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                        Select a request from the sidebar to view its details
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryConsole;

