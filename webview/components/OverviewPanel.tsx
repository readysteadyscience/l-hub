import React, { useState, useEffect } from 'react';
import { vscode } from '../vscode-api';
import { radius } from '../theme';
import { Lang } from './Dashboard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelStatus {
    id: string;
    label: string;
    modelId: string;
    group: string;
    providerGroup?: string;
    enabled: boolean;
    status: 'online' | 'offline' | 'unknown';
    testMsg?: string;
}

interface OverviewStats {
    models: ModelStatus[];
    todayRequests: number;
    successRate: number;
    avgLatency: number;
    totalTokens: number;
    recentRequests: {
        id: string;
        timestamp: number;
        method: string;
        model: string;
        duration: number;
        status: 'success' | 'error';
        totalTokens: number;
    }[];
}

// ─── Monochrome HUD Stat Component ──────────────────────────────────────────

const HUDStat: React.FC<{
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}> = ({ label, value, sub, accent }) => (
    <div style={{
        background: 'var(--vscode-editor-background)',
        padding: '20px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
    }}>
        <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
            {label}
        </div>
        <div style={{
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'SF Mono', monospace",
            fontSize: '32px',
            fontWeight: 800,
            color: accent || 'var(--vscode-editor-foreground)',
            lineHeight: 1,
            letterSpacing: '-1px',
            marginBottom: '6px'
        }}>
            {value}
        </div>
        {sub && (
            <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', opacity: 0.6, fontFamily: 'monospace' }}>
                {sub}
            </div>
        )}
    </div>
);

// ─── Minimalist Status Dot ──────────────────────────────────────────────────

const statusInfo = (s: string) => {
    if (s === 'online') return { color: '#10B981', label: 'ON' }; // Sleek green
    if (s === 'offline') return { color: '#EF4444', label: 'OFF' }; // Sleek red
    return { color: '#6B7280', label: 'N/A' };
};

const ModelStatusChip: React.FC<{ m: ModelStatus }> = ({ m }) => {
    const info = statusInfo(m.status);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px',
            borderRadius: radius.sm,
            background: 'var(--vscode-editor-background)',
            border: `1px solid ${m.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'var(--vscode-panel-border)'}`,
            fontSize: '12px',
            opacity: m.enabled ? 1 : 0.4,
            transition: 'all 0.15s',
            cursor: 'default',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = m.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'var(--vscode-panel-border)'; }}
            title={m.testMsg || (m.status === 'online' ? '在线' : m.status === 'offline' ? '离线' : '未测试')}
        >
            <span style={{
                display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                background: info.color,
                boxShadow: m.status === 'online' ? `0 0 8px ${info.color}` : 'none',
                flexShrink: 0,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <span style={{
                    fontWeight: 600, fontSize: '12px', fontFamily: 'monospace',
                    color: 'var(--vscode-editor-foreground)',
                }}>
                    {m.group === 'cli' ? m.label : (m.group?.split(' ')[0] || m.modelId).toUpperCase()}
                </span>
                <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '10px', fontFamily: 'monospace' }}>
                    {m.group === 'cli' ? (m.testMsg || '') : m.label?.split(' ').slice(0, 2).join(' ')}
                </span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: info.color, opacity: 0.8 }}>
                {info.label}
            </span>
        </div>
    );
};

// ─── Minimalist Brand Card ──────────────────────────────────────────────────

const BrandStatusCard: React.FC<{ brand: string; models: ModelStatus[] }> = ({ brand, models }) => {
    const activeModels = models.filter(m => m.enabled);
    const isOnline = activeModels.some(m => m.status === 'online');
    const isEnabled = activeModels.length > 0;
    const info = statusInfo(isOnline ? 'online' : (isEnabled ? 'offline' : 'unknown'));

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            padding: '12px 14px',
            borderRadius: radius.sm,
            background: 'var(--vscode-editor-background)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.2)' : 'var(--vscode-panel-border)'}`,
            opacity: isEnabled ? 1 : 0.4,
            transition: 'all 0.15s',
            cursor: 'default',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isOnline ? 'rgba(16, 185, 129, 0.2)' : 'var(--vscode-panel-border)'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                        background: info.color,
                        boxShadow: isOnline ? `0 0 8px ${info.color}` : 'none',
                    }} />
                    <span style={{
                        fontWeight: 600, fontSize: '12px', fontFamily: 'monospace',
                        color: 'var(--vscode-editor-foreground)',
                    }}>
                        {brand.toUpperCase()}
                    </span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: info.color, opacity: 0.8 }}>
                    {info.label}
                </span>
            </div>
            {activeModels.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {activeModels.map(m => {
                        // Auto-prefix brand name if label doesn't already contain it
                        const displayLabel = m.label.toLowerCase().includes(brand.toLowerCase())
                            ? m.label
                            : `${brand}-${m.label}`;
                        return (
                            <div key={m.id} style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                                • {displayLabel}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace', opacity: 0.6 }}>
                    未配置 / Not Configured
                </div>
            )}
        </div>
    );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        marginBottom: '16px',
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{
                fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                color: 'var(--vscode-editor-foreground)'
            }}>
                {title}
            </div>
            {subtitle && <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>{subtitle}</div>}
        </div>
        {right && <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>{right}</div>}
    </div>
);

// ─── OverviewPanel ────────────────────────────────────────────────────────────

const OverviewPanel: React.FC<{ lang: Lang }> = ({ lang }) => {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [testingAll, setTestingAll] = useState(false);
    const [autoAcceptActive, setAutoAcceptActive] = useState(false);
    const [cacheSizeGB, setCacheSizeGB] = useState<string | null>(null);

    const hasAutoTriggered = React.useRef(false);

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.data.command === 'overviewStats') {
                setStats(ev.data.stats);
                // Auto-trigger test once if no models are online (first load after reload)
                const models = ev.data.stats?.models || [];
                const apiModels = models.filter((m: any) => m.group !== 'cli');
                const onlineApi = apiModels.filter((m: any) => m.status === 'online').length;
                if (!hasAutoTriggered.current && onlineApi === 0 && apiModels.length > 0) {
                    hasAutoTriggered.current = true;
                    setTestingAll(true);
                    setTimeout(() => vscode.postMessage({ command: 'testAllModels' }), 1000);
                }
            }
            if (ev.data.command === 'testAllComplete') {
                setTestingAll(false);
                // Refresh stats to pick up new test results from the cache
                vscode.postMessage({ command: 'getOverviewStats' });
            }
            if (ev.data.command === 'autoAcceptStatus') {
                setAutoAcceptActive(ev.data.active);
            }
            if (ev.data.command === 'brainCacheList') {
                const entries = ev.data.entries || [];
                const totalMB = entries.reduce((s: number, e: any) => s + e.sizeMB, 0);
                setCacheSizeGB((totalMB / 1024).toFixed(1));
            }
            // Listen to individual test results and update model status in real-time
            if (ev.data.command === 'testResult' && ev.data.requestId?.startsWith('autotest_')) {
                const parts = ev.data.requestId.split('_');
                const configId = parts.slice(1, -1).join('_');
                setStats(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        models: prev.models.map(m =>
                            m.id === configId
                                ? { ...m, status: ev.data.ok ? 'online' : 'offline', testMsg: ev.data.msg }
                                : m
                        ),
                    };
                });
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'getOverviewStats' });
        vscode.postMessage({ command: 'getAutoAcceptStatus' });
        vscode.postMessage({ command: 'scanBrainCache' });

        const timer = setInterval(() => {
            vscode.postMessage({ command: 'getOverviewStats' });
        }, 30000);

        return () => {
            window.removeEventListener('message', handler);
            clearInterval(timer);
        };
    }, []);

    const T = {
        en: {
            models: 'MODELS', requests: 'REQUESTS', latency: 'LATENCY', tokens: 'TOKENS',
            online: 'online', today: 'today', modelStatus: 'System Status',
            recentActivity: 'Live Activity', quickActions: 'Quick Actions',
            testAll: 'Test All Connections', addModel: '+ Add Model', viewHistory: 'View History',
            noModels: 'No models configured yet. Add your first model to get started.',
            noActivity: 'No recent activity. Make an API call to see it here.',
            success: 'success',
        },
        zh: {
            models: '模型', requests: '请求', latency: '延迟', tokens: 'TOKEN',
            online: '在线', today: '今日', modelStatus: '系统状态',
            recentActivity: '实时动态', quickActions: '快速操作',
            testAll: '一键全部测试', addModel: '+ 添加模型', viewHistory: '查看历史',
            noModels: '尚未配置任何模型，点击下方按钮开始添加。',
            noActivity: '暂无近期调用，发起一次 API 请求后将显示。',
            success: '成功',
        },
    }[lang];

    if (!stats) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="shimmer-bar" style={{ width: '200px', height: '4px', borderRadius: '2px', marginBottom: '12px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>
                        {lang === 'zh' ? '加载仪表盘…' : 'Loading dashboard…'}
                    </span>
                </div>
            </div>
        );
    }

    const onlineCount = stats.models.filter(m => m.status === 'online').length;
    const totalModels = stats.models.length;
    const apiModels = stats.models.filter(m => m.group !== 'cli');
    const cliModels = stats.models.filter(m => m.group === 'cli');

    // Group API models by providerGroup
    const apiModelsByBrand = apiModels.reduce((acc, m) => {
        const brand = m.providerGroup || 'Unknown';
        if (!acc[brand]) acc[brand] = [];
        acc[brand].push(m);
        return acc;
    }, {} as Record<string, ModelStatus[]>);

    return (
        <div style={{ maxWidth: '860px', padding: '10px 0' }}>
            {/* ── Monochrome HUD ────────────────────────────────────────────── */}
            <div className="animate-in" style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px',
                background: 'var(--vscode-panel-border)', border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.md, overflow: 'hidden',
                marginBottom: '32px'
            }}>
                <HUDStat 
                    label={lang === 'zh' ? '网络核心' : 'NETWORK CORE'}
                    value={`${onlineCount}/${totalModels}`} 
                    sub={lang === 'zh' ? '在线 / 总计' : 'ONLINE / TOTAL'}
                    accent="#10B981" 
                />
                <HUDStat 
                    label={lang === 'zh' ? '调用量 (24H)' : 'TX VOL (24H)'}
                    value={stats.todayRequests || '0'} 
                    sub={`${lang === 'zh' ? '成功率' : 'SR'}: ${stats.successRate}%`} 
                />
                <HUDStat 
                    label={lang === 'zh' ? '平均延迟' : 'AVG LATENCY'}
                    value={stats.avgLatency > 0 ? `${(stats.avgLatency / 1000).toFixed(1)}s` : '—'} 
                    sub={lang === 'zh' ? '毫秒/请求' : 'MS/REQ'}
                />
                <HUDStat 
                    label={lang === 'zh' ? 'Token 产出' : 'TOKEN YIELD'}
                    value={stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}K` : (stats.totalTokens || '—')} 
                    sub={lang === 'zh' ? '已消耗' : 'COMPUTED'}
                />
            </div>

            {/* ── Quick Controls ───────────────────────────────────────── */}
            <div className="animate-in" style={{
                display: 'flex', gap: '12px', marginBottom: '24px',
                flexWrap: 'wrap', alignItems: 'center',
            }}>
                <button
                    onClick={() => vscode.postMessage({ command: 'toggleAutoAccept' })}
                    style={{
                        padding: '6px 14px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 600,
                        border: `1px solid ${autoAcceptActive ? '#F59E0B' : 'var(--vscode-panel-border)'}`,
                        borderRadius: radius.sm, cursor: 'pointer',
                        background: autoAcceptActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                        color: autoAcceptActive ? '#F59E0B' : 'var(--vscode-editor-foreground)',
                        transition: 'all 0.15s',
                    }}
                >
                    {autoAcceptActive ? '🚀 Auto-Accept ON' : '🚀 Auto-Accept OFF'}
                </button>
                {cacheSizeGB && (
                    <span style={{
                        padding: '6px 14px', fontSize: '11px', fontFamily: 'monospace',
                        border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm,
                        color: parseFloat(cacheSizeGB) > 5 ? '#EF4444' : 'var(--vscode-descriptionForeground)',
                    }}>
                        💾 {lang === 'zh' ? `Brain 缓存: ${cacheSizeGB} GB` : `Brain Cache: ${cacheSizeGB} GB`}
                    </span>
                )}
            </div>

            {/* ── API Brand Matrix ──────────────────────────────────────────── */}
            <div className="animate-in animate-in-1" style={{ marginBottom: '32px' }}>
                <SectionHeader 
                    title={lang === 'zh' ? 'API 路由矩阵' : 'API Routing Matrix'}
                    subtitle={lang === 'zh' ? '云端专家模型' : 'CLOUD EXPERT BRANDS'}
                    right={
                        <button
                            style={{
                                padding: '4px 12px', background: 'transparent',
                                color: 'var(--vscode-editor-foreground)',
                                border: '1px solid var(--vscode-panel-border)',
                                borderRadius: radius.sm, cursor: testingAll ? 'wait' : 'pointer',
                                fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
                                opacity: testingAll ? 0.5 : 1, transition: 'all 0.15s'
                            }}
                            disabled={testingAll}
                            onClick={() => {
                                setTestingAll(true);
                                vscode.postMessage({ command: 'testAllModels' });
                            }}
                            onMouseEnter={e => { if (!testingAll) e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--vscode-panel-border)'; }}
                        >
                            {testingAll ? (lang === 'zh' ? '[ 检测中... ]' : '[ TESTING... ]') : (lang === 'zh' ? '[ 全部检测 ]' : '[ ping_all ]')}
                        </button>
                    }
                />
                {Object.keys(apiModelsByBrand).length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {Object.entries(apiModelsByBrand).map(([brand, _models]) => (
                            <BrandStatusCard key={brand} brand={brand} models={_models} />
                        ))}
                    </div>
                ) : (
                    <div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', fontFamily: 'monospace' }}>
                        {lang === 'zh' ? '暂无 API 模型。' : 'No API models supported.'}
                    </div>
                )}
            </div>

            {/* ── CLI Agents Matrix ─────────────────────────────────────────── */}
            <div className="animate-in animate-in-2" style={{ marginBottom: '32px' }}>
                <SectionHeader 
                    title={lang === 'zh' ? '本地 CLI 沙箱' : 'Local CLI Sandboxes'}
                    subtitle={lang === 'zh' ? '免配置订阅制智能体' : 'ZERO-CONFIG SUBSCRIPTION AGENTS'}
                />
                {cliModels.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                        {cliModels.map(m => <ModelStatusChip key={m.id} m={m} />)}
                    </div>
                ) : (
                    <div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', fontFamily: 'monospace' }}>
                        {lang === 'zh' ? '暂无 CLI 模型。' : 'No CLI models supported.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverviewPanel;
