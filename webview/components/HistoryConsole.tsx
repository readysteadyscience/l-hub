import React, { useState, useEffect } from 'react';
import { vscode } from '../vscode-api';
import { VSCodeTag, VSCodeDivider } from '@vscode/webview-ui-toolkit/react';
import { Lang } from './Dashboard';
import { s, colors, radius, shadow } from '../theme';

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

const HistoryConsole: React.FC<{ lang: Lang }> = ({ lang }) => {
    const [records, setRecords] = useState<RequestRecord[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const T = {
        en: { title: 'Request History', clear: 'Clear', empty: 'No requests yet. Make an ai_ask call to see history.', search: 'Search method, model, prompt…', model: 'Model', tokens: 'Tokens', duration: 'Duration', status: 'Status', request: 'Request', response: 'Response' },
        zh: { title: '调用历史', clear: '清空', empty: '暂无记录，调用 ai_ask 后将显示在这里。', search: '搜索 method / 模型 / prompt…', model: '模型', tokens: 'Token', duration: '耗时', status: '状态', request: '请求内容', response: '响应内容' },
    }[lang];

    const filtered = search.trim()
        ? records.filter(r =>
            r.method.toLowerCase().includes(search.toLowerCase()) ||
            (r.model || '').toLowerCase().includes(search.toLowerCase()) ||
            r.requestPreview.toLowerCase().includes(search.toLowerCase())
        )
        : records;

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

        const timer = setInterval(loadPage, 3000);
        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(timer);
        };
    }, []);

    const selectedRecord = records.find(r => r.id === selectedId);

    return (
        <div style={{ display: 'flex', height: '100%', gap: '0', borderRadius: radius.sm, overflow: 'hidden', border: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)' }}>
            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <div style={{
                width: '300px',
                borderRight: '1px solid var(--vscode-panel-border)',
                overflowY: 'auto',
                backgroundColor: 'var(--vscode-sideBar-background)',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Search box */}
                <div style={{ padding: '10px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                    <input
                        type="text"
                        placeholder={T.search}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            ...s.input,
                            fontSize: '12px',
                            padding: '7px 10px',
                        }}
                    />
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filtered.map(record => (
                        <div
                            key={record.id}
                            onClick={() => setSelectedId(record.id)}
                            style={{
                                padding: '12px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--vscode-panel-border)',
                                backgroundColor: selectedId === record.id ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                                color: selectedId === record.id ? 'var(--vscode-list-activeSelectionForeground)' : 'inherit',
                                transition: 'background 0.15s',
                                borderLeft: `3px solid ${record.status === 'success' ? '#10B981' : '#EF4444'}`,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', marginBottom: '4px' }}>
                                <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
                                <span style={{ color: record.status === 'success' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                    {record.duration}ms
                                </span>
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: '4px' }}>&gt; {record.method}</div>
                            {record.model && <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', marginBottom: '4px' }}>[{record.model}]</div>}
                            {(record.inputTokens || record.outputTokens) ? (
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', opacity: 0.8 }}>
                                    TOKENS: {record.totalTokens || ((record.inputTokens || 0) + (record.outputTokens || 0))}
                                </div>
                            ) : null}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{
                            padding: '40px 20px', textAlign: 'center',
                            fontSize: '13px', color: 'var(--vscode-descriptionForeground)',
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                            {search ? `No results for "${search}"` : T.empty}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Detail Panel ─────────────────────────────────────────── */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {selectedRecord ? (
                    <div style={{ maxWidth: '800px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '12px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px' }}>
                            &gt; {selectedRecord.method}
                        </h2>
                        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: '11px' }}>
                            <span style={{
                                display: 'inline-block', padding: '4px 8px', borderRadius: radius.sm, fontWeight: 600,
                                background: selectedRecord.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: selectedRecord.status === 'success' ? '#10B981' : '#EF4444',
                                border: `1px solid ${selectedRecord.status === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}>
                                [ {selectedRecord.status.toUpperCase()} ]
                            </span>

                            {selectedRecord.model && selectedRecord.model !== 'unknown' && (
                                <span style={{
                                    display: 'inline-block', padding: '4px 8px', borderRadius: radius.sm,
                                    background: 'transparent', color: 'var(--vscode-editor-foreground)',
                                    border: '1px solid var(--vscode-panel-border)',
                                }}>
                                    [ MODEL: {selectedRecord.model} ]
                                </span>
                            )}

                            <span style={{
                                display: 'inline-block', padding: '4px 8px', borderRadius: radius.sm,
                                border: '1px solid var(--vscode-panel-border)',
                                color: 'var(--vscode-editor-foreground)',
                            }}>
                                [ {selectedRecord.duration}ms ]
                            </span>

                            {(selectedRecord.inputTokens || selectedRecord.outputTokens) ? (
                                <span style={{
                                    display: 'inline-block', padding: '4px 8px', borderRadius: radius.sm,
                                    border: '1px solid var(--vscode-panel-border)',
                                    color: 'var(--vscode-editor-foreground)',
                                }}>
                                    [ I:{selectedRecord.inputTokens || 0} | O:{selectedRecord.outputTokens || 0} ]
                                </span>
                            ) : null}
                        </div>

                        <div style={{ height: '1px', background: 'var(--vscode-panel-border)', margin: '20px 0' }} />

                        <div style={{ marginTop: '16px', color: 'var(--vscode-editor-foreground)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>
                            --- REQUEST_PAYLOAD ---
                        </div>
                        <pre style={{
                            background: 'var(--vscode-editor-inactiveSelectionBackground)',
                            padding: '16px', borderRadius: radius.sm,
                            overflowX: 'auto', fontSize: '12px', whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            border: '1px dashed var(--vscode-panel-border)',
                            color: 'var(--vscode-editor-foreground)',
                        }}>
                            {selectedRecord.requestPreview}
                        </pre>

                        <div style={{ marginTop: '24px', color: 'var(--vscode-editor-foreground)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>
                            --- RESPONSE_PAYLOAD ---
                        </div>
                        <pre style={{
                            background: 'var(--vscode-editor-inactiveSelectionBackground)',
                            padding: '16px', borderRadius: radius.sm,
                            overflowX: 'auto', fontSize: '12px', whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            border: '1px dashed var(--vscode-panel-border)',
                            color: 'var(--vscode-editor-foreground)',
                        }}>
                            {selectedRecord.responsePreview}
                        </pre>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: '8px',
                        color: 'var(--vscode-descriptionForeground)',
                        fontFamily: 'monospace',
                    }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                            [ SELECT_NODE_TO_INSPECT_TRAFFIC ]
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryConsole;
