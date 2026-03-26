import React, { useState, useEffect } from 'react';
import { radius } from '../theme';
import { Lang } from './Dashboard';
import { vscode } from '../vscode-api';

interface CacheEntry {
    id: string;
    sizeMB: number;
    fileCount: number;
    lastModified: number;
    summary: string;
}

const CachePanel: React.FC<{ lang: Lang }> = ({ lang }) => {
    const isEN = lang === 'en';
    const [entries, setEntries] = useState<CacheEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<'size' | 'time'>('size');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const msg = event.data;
            if (msg.command === 'brainCacheList') {
                setEntries(msg.entries || []);
                setLoading(false);
            } else if (msg.command === 'brainCacheDeleted') {
                setEntries(prev => prev.filter(e => !msg.deletedIds.includes(e.id)));
                setSelected(new Set());
                setDeleting(false);
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'scanBrainCache' });
        return () => window.removeEventListener('message', handler);
    }, []);

    const sorted = [...entries].sort((a, b) =>
        sortBy === 'size' ? b.sizeMB - a.sizeMB : b.lastModified - a.lastModified
    );

    const totalMB = entries.reduce((s, e) => s + e.sizeMB, 0);
    const totalGB = (totalMB / 1024).toFixed(1);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === entries.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(entries.map(e => e.id)));
        }
    };

    const handleDelete = () => {
        if (selected.size === 0) return;
        const ids = Array.from(selected);
        const sizeMB = entries.filter(e => ids.includes(e.id)).reduce((s, e) => s + e.sizeMB, 0);
        const confirmMsg = isEN
            ? `Delete ${ids.length} conversation(s) (${formatSize(sizeMB)})?`
            : `删除 ${ids.length} 个对话缓存（${formatSize(sizeMB)}）？`;
        setDeleting(true);
        vscode.postMessage({ command: 'deleteBrainCache', ids, confirmMsg });
    };

    const formatSize = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
    const formatDate = (ts: number) => {
        const d = new Date(ts);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const barMaxMB = sorted.length > 0 ? sorted[0].sizeMB : 1;

    return (
        <div className="animate-in" style={{ maxWidth: '860px', paddingBottom: '20px' }}>
            {/* Header Stats */}
            <div style={{
                display: 'flex', gap: '16px', marginBottom: '20px',
                flexWrap: 'wrap',
            }}>
                <StatCard
                    label={isEN ? 'Total Cache' : '缓存总量'}
                    value={`${totalGB} GB`}
                    color={totalMB > 5120 ? '#EF4444' : totalMB > 2048 ? '#F59E0B' : '#10B981'}
                />
                <StatCard
                    label={isEN ? 'Conversations' : '对话数'}
                    value={`${entries.length}`}
                    color="var(--vscode-editor-foreground)"
                />
                <StatCard
                    label={isEN ? 'Selected' : '已选中'}
                    value={`${selected.size}`}
                    color={selected.size > 0 ? '#3B82F6' : 'var(--vscode-descriptionForeground)'}
                />
            </div>

            {/* Toolbar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={selectAll} style={btnStyle(false)}>
                        {selected.size === entries.length && entries.length > 0
                            ? (isEN ? '☐ Deselect All' : '☐ 取消全选')
                            : (isEN ? '☑ Select All' : '☑ 全选')}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={selected.size === 0 || deleting}
                        style={{
                            ...btnStyle(true),
                            opacity: selected.size === 0 ? 0.4 : 1,
                            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {deleting
                            ? (isEN ? '⏳ Deleting...' : '⏳ 删除中...')
                            : (isEN ? '🗑 Delete Selected' : '🗑 删除选中')}
                    </button>
                    <button onClick={() => {
                        setLoading(true);
                        vscode.postMessage({ command: 'scanBrainCache' });
                    }} style={btnStyle(false)}>
                        {isEN ? '🔄 Refresh' : '🔄 刷新'}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                        {isEN ? 'Sort:' : '排序:'}
                    </span>
                    <button onClick={() => setSortBy('size')} style={pillBtn(sortBy === 'size')}>
                        {isEN ? 'Size ↓' : '大小 ↓'}
                    </button>
                    <button onClick={() => setSortBy('time')} style={pillBtn(sortBy === 'time')}>
                        {isEN ? 'Recent ↓' : '最近 ↓'}
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                    {isEN ? '⏳ Scanning brain cache...' : '⏳ 扫描缓存中...'}
                </div>
            ) : sorted.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--vscode-descriptionForeground)' }}>
                    {isEN ? '✨ No cache found' : '✨ 无缓存'}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sorted.map((entry) => {
                        const isSelected = selected.has(entry.id);
                        const barWidth = Math.max(4, (entry.sizeMB / barMaxMB) * 100);
                        return (
                            <div
                                key={entry.id}
                                onClick={() => toggleSelect(entry.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 12px',
                                    background: isSelected
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'var(--vscode-editor-background)',
                                    border: `1px solid ${isSelected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
                                    borderRadius: radius.sm,
                                    cursor: 'pointer',
                                    transition: 'all 0.1s',
                                }}
                            >
                                {/* Checkbox */}
                                <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>
                                    {isSelected ? '☑' : '☐'}
                                </span>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '12px', fontFamily: 'monospace',
                                        color: 'var(--vscode-editor-foreground)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {entry.summary || entry.id}
                                    </div>
                                    <div style={{
                                        fontSize: '10px', color: 'var(--vscode-descriptionForeground)',
                                        fontFamily: 'monospace', marginTop: '2px',
                                    }}>
                                        {entry.id.substring(0, 8)}… · {entry.fileCount} {isEN ? 'files' : '文件'} · {formatDate(entry.lastModified)}
                                    </div>
                                </div>

                                {/* Size bar */}
                                <div style={{ width: '120px', flexShrink: 0 }}>
                                    <div style={{
                                        fontSize: '11px', fontWeight: 600, fontFamily: 'monospace',
                                        textAlign: 'right', marginBottom: '2px',
                                        color: entry.sizeMB > 512 ? '#EF4444' : entry.sizeMB > 100 ? '#F59E0B' : 'var(--vscode-editor-foreground)',
                                    }}>
                                        {formatSize(entry.sizeMB)}
                                    </div>
                                    <div style={{
                                        height: '3px', background: 'var(--vscode-panel-border)',
                                        borderRadius: '2px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%', width: `${barWidth}%`,
                                            background: entry.sizeMB > 512 ? '#EF4444' : entry.sizeMB > 100 ? '#F59E0B' : '#10B981',
                                            borderRadius: '2px',
                                            transition: 'width 0.3s',
                                        }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ── Helper Components & Styles ─────────────────────────── */

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div style={{
        padding: '12px 20px',
        background: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: radius.sm,
        minWidth: '120px',
    }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--vscode-descriptionForeground)', marginBottom: '4px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            {label}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: 'monospace' }}>
            {value}
        </div>
    </div>
);

const btnStyle = (danger: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 600,
    border: `1px solid ${danger ? '#EF4444' : 'var(--vscode-panel-border)'}`,
    borderRadius: radius.sm,
    background: danger ? 'rgba(239,68,68,0.1)' : 'transparent',
    color: danger ? '#EF4444' : 'var(--vscode-editor-foreground)',
    cursor: 'pointer',
});

const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    fontSize: '11px',
    fontFamily: 'monospace',
    border: 'none',
    borderRadius: '12px',
    background: active ? 'var(--vscode-badge-background)' : 'transparent',
    color: active ? 'var(--vscode-badge-foreground)' : 'var(--vscode-descriptionForeground)',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
});

export default CachePanel;
