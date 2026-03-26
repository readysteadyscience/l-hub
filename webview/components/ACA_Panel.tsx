import React, { useEffect, useMemo, useState } from 'react';
import { vscode } from '../vscode-api';
import { radius } from '../theme';
import type { Lang } from './Dashboard';

type AuditRisk = 'SAFE' | 'WARNING' | 'CRITICAL';

interface AuditEntry {
    provider: string;
    reviewer?: string;
    risk: AuditRisk;
    reasoning: string;
    summary?: string;
}

interface AcaReport {
    results?: AuditEntry[];
    candidates?: AuditEntry[];
    verdict?: string;
    timestamp?: number;
}

const riskInfo: Record<AuditRisk, { color: string; icon: string; labelEn: string; labelZh: string }> = {
    SAFE:     { color: '#10B981', icon: '✅', labelEn: 'SAFE',     labelZh: '安全' },
    WARNING:  { color: '#F59E0B', icon: '⚠️', labelEn: 'WARNING',  labelZh: '警告' },
    CRITICAL: { color: '#EF4444', icon: '🚨', labelEn: 'CRITICAL', labelZh: '严重' },
};

function inferRisk(raw: string): AuditRisk {
    const text = raw.toLowerCase();
    if (/(critical|severe|unsafe|high risk|严重|高危|backdoor|漏洞)/.test(text)) return 'CRITICAL';
    if (/(warning|caution|potential|risk|注意|可疑|回归|bug|issue|问题)/.test(text)) return 'WARNING';
    return 'SAFE';
}

function normalizeEntries(payload: unknown): AuditEntry[] {
    const source = Array.isArray(payload)
        ? payload
        : typeof payload === 'object' && payload !== null
            ? ((payload as AcaReport).results || (payload as AcaReport).candidates || [])
            : [];
    if (!Array.isArray(source)) return [];

    return source
        .filter((item): item is Record<string, any> => item && typeof item === 'object')
        .map((item): AuditEntry => {
            const reasoning = String(item.reasoning || item.details || item.text || '').trim();
            const riskValue = String(item.risk || '').toUpperCase();
            return {
                provider: String(item.provider || item.reviewer || item.label || 'Unknown'),
                risk: (riskValue === 'SAFE' || riskValue === 'WARNING' || riskValue === 'CRITICAL')
                    ? riskValue as AuditRisk : inferRisk(reasoning),
                reasoning: reasoning || '',
                summary: String(item.summary || '').trim(),
            };
        })
        .sort((a, b) => {
            const w: Record<AuditRisk, number> = { CRITICAL: 3, WARNING: 2, SAFE: 1 };
            return w[b.risk] - w[a.risk];
        });
}

const ACAPanel: React.FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [verdict, setVerdict] = useState<string>('');
    const [acaEnabled, setAcaEnabled] = useState<boolean>(true);

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.data?.type === 'ACA_AUDIT_REPORT') {
                const payload = ev.data.payload;
                setEntries(normalizeEntries(payload));
                setVerdict(payload?.verdict || '');
                setUpdatedAt(Date.now());
            }
            if (ev.data?.command === 'acaEnabled') {
                setAcaEnabled(!!ev.data.enabled);
            }
        };
        window.addEventListener('message', handler);
        // Query initial state
        vscode.postMessage({ command: 'getAcaEnabled' });
        return () => window.removeEventListener('message', handler);
    }, []);

    const zh = lang === 'zh';

    const statusText = useMemo(() => {
        if (entries.length === 0) return zh ? '等待 Git Commit 触发审查…' : 'Waiting for Git Commit review…';
        if (verdict === 'BLOCKED') return zh ? '🚫 Commit 已被拦截' : '🚫 Commit Blocked';
        if (entries.some(e => e.risk === 'CRITICAL')) return zh ? '发现严重问题' : 'Critical issues found';
        if (entries.some(e => e.risk === 'WARNING')) return zh ? '发现潜在问题' : 'Warnings detected';
        return zh ? '审查通过' : 'Review passed';
    }, [entries, verdict, zh]);

    return (
        <section style={{
            marginTop: '24px',
            borderRadius: radius.md,
            border: '1px solid var(--vscode-panel-border)',
            background: 'var(--vscode-editor-background)',
            overflow: 'hidden',
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '1px solid var(--vscode-panel-border)',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                        fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                        color: 'var(--vscode-editor-foreground)',
                    }}>
                        {zh ? 'ACA 代码审查' : 'ACA Code Review'}
                    </div>
                    <div style={{
                        fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace',
                    }}>
                        {zh ? 'Git Pre-Commit · 智能降级审查' : 'Git Pre-Commit · Smart Cascade Review'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace',
                        textAlign: 'right',
                    }}>
                        {updatedAt
                            ? `${zh ? '最近审查' : 'Last review'}: ${new Date(updatedAt).toLocaleTimeString()}`
                            : (zh ? '状态: 待触发' : 'Status: Idle')
                        }
                    </div>
                    <button
                        onClick={() => {
                            vscode.postMessage({ command: 'setAcaEnabled', enabled: !acaEnabled });
                        }}
                        style={{
                            padding: '3px 10px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            border: `1px solid ${acaEnabled ? '#10B981' : 'var(--vscode-panel-border)'}`,
                            borderRadius: '3px',
                            background: acaEnabled ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            color: acaEnabled ? '#10B981' : 'var(--vscode-descriptionForeground)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {acaEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '16px' }}>
                {entries.length === 0 ? (
                    /* Empty state */
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px 16px',
                        borderRadius: radius.sm,
                        border: '1px dashed var(--vscode-panel-border)',
                        color: 'var(--vscode-descriptionForeground)',
                        fontSize: '12px', fontFamily: 'monospace',
                    }}>
                        <span style={{ fontSize: '16px' }}>🔍</span>
                        <div>
                            <div>{statusText}</div>
                            <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7 }}>
                                {zh
                                    ? '执行 git commit 后，ACA 将自动调用可用审查员（Codex CLI → Gemini CLI → Cloud 模型）进行代码审查。'
                                    : 'ACA will auto-review staged changes on git commit using available reviewers (Codex CLI → Gemini CLI → Cloud models).'}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Results */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Verdict banner */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 14px', borderRadius: radius.sm,
                            background: verdict === 'BLOCKED'
                                ? 'rgba(239, 68, 68, 0.08)'
                                : entries.some(e => e.risk === 'WARNING')
                                    ? 'rgba(245, 158, 11, 0.08)'
                                    : 'rgba(16, 185, 129, 0.08)',
                            border: `1px solid ${
                                verdict === 'BLOCKED' ? 'rgba(239, 68, 68, 0.2)'
                                : entries.some(e => e.risk === 'WARNING') ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(16, 185, 129, 0.2)'
                            }`,
                            fontSize: '12px', fontWeight: 600, fontFamily: 'monospace',
                        }}>
                            {statusText}
                        </div>

                        {/* Individual results */}
                        {entries.map((entry, i) => {
                            const info = riskInfo[entry.risk];
                            return (
                                <details key={`${entry.provider}-${i}`} open={entry.risk !== 'SAFE'} style={{
                                    borderRadius: radius.sm,
                                    border: '1px solid var(--vscode-panel-border)',
                                    overflow: 'hidden',
                                }}>
                                    <summary style={{
                                        cursor: 'pointer', listStyle: 'none',
                                        padding: '10px 14px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontSize: '12px', fontFamily: 'monospace',
                                        color: 'var(--vscode-editor-foreground)',
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{info.icon}</span>
                                            <span style={{ fontWeight: 600 }}>{entry.provider}</span>
                                            {entry.summary && (
                                                <span style={{ color: 'var(--vscode-descriptionForeground)', fontWeight: 400 }}>
                                                    — {entry.summary.slice(0, 60)}
                                                </span>
                                            )}
                                        </span>
                                        <span style={{ color: info.color, fontWeight: 700, fontSize: '10px' }}>
                                            {zh ? info.labelZh : info.labelEn}
                                        </span>
                                    </summary>
                                    {entry.reasoning && (
                                        <div style={{
                                            borderTop: '1px solid var(--vscode-panel-border)',
                                            padding: '12px 14px',
                                            fontSize: '12px', lineHeight: 1.6,
                                            color: 'var(--vscode-descriptionForeground)',
                                            whiteSpace: 'pre-wrap', fontFamily: 'monospace',
                                        }}>
                                            {entry.reasoning}
                                        </div>
                                    )}
                                </details>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ACAPanel;
