import React, { useState, useEffect, useCallback } from 'react';
import { vscode } from '../vscode-api';
import { s, radius, providerColors } from '../theme';
import {
    ModelConfig, ModelDef, TASK_TYPES, MODEL_DEFS, GROUP_MODEL_EXAMPLES,
    GROUPS, RELAY_PRESETS, PRICE_TABLE, USD_TO_CNY, formatPrice,
} from './config/model-registry';



// ─── AddEditModal ─────────────────────────────────────────────────────────────

const AddEditModal: React.FC<{
    lang: string;
    existing?: { model: ModelConfig; apiKey: string };
    onSave: (model: ModelConfig, apiKey: string) => void;
    onClose: () => void;
}> = ({ lang, existing, onSave, onClose }) => {
    const isEdit = !!existing;

    const [selectedGroup, setSelectedGroup] = useState(() => {
        if (existing) {
            // Try MODEL_DEFS lookup first (covers known models)
            const fromDef = MODEL_DEFS[existing.model.modelId]?.group;
            if (fromDef) return fromDef;
            // Fallback: detect from baseUrl pattern
            const url = existing.model.baseUrl || '';
            if (url.includes('bigmodel.cn') || url.includes('zhipuai')) return 'GLM (智谱)';
            if (url.includes('dashscope') || url.includes('aliyuncs')) return 'Qwen (通义)';
            if (url.includes('minimax') || url.includes('minimaxi')) return 'MiniMax';
            if (url.includes('moonshot') || url.includes('kimi')) return 'Moonshot (Kimi)';
            if (url.includes('deepseek')) return 'DeepSeek';
            if (url.includes('anthropic') || url.includes('claude')) return 'OpenAI';
            if (url.includes('openai') || url.includes('googleapis')) return 'OpenAI';
        }
        return GROUPS[0];
    });
    const [selectedModelId, setSelectedModelId] = useState(existing?.model.modelId || '');
    const [customModelId, setCustomModelId] = useState(existing?.model.modelId || '');
    const [customLabel, setCustomLabel] = useState(existing?.model.label || '');
    const [baseUrl, setBaseUrl] = useState(existing?.model.baseUrl || '');
    const [tasks, setTasks] = useState<string[]>(existing?.model.tasks || []);
    const [apiKey, setApiKey] = useState(existing?.apiKey || '');
    const [step, setStep] = useState(existing ? 2 : 1);

    const isCustomGroup = selectedGroup === '自定义接口';
    const isRelayGroup = selectedGroup === '第三方中转';
    const modelsInGroup = isRelayGroup
        ? Object.entries(MODEL_DEFS).filter(([, d]) => d.group !== '自定义接口' && d.group !== '第三方中转')
        : Object.entries(MODEL_DEFS).filter(([, d]) => d.group === selectedGroup && d.group !== '自定义接口');
    const effectiveModelId = isCustomGroup ? '__custom__' : selectedModelId;
    const def = MODEL_DEFS[effectiveModelId];

    const handleGroupChange = (g: string) => {
        setSelectedGroup(g);
        const isRelay = g === '第三方中转';
        // For relay group, pick first available model from all providers
        const candidates = isRelay
            ? Object.entries(MODEL_DEFS).filter(([, d]) => d.group !== '自定义接口' && d.group !== '第三方中转')
            : Object.entries(MODEL_DEFS).filter(([, d]) => d.group === g && d.group !== '自定义接口');
        const first = candidates[0];
        if (first) {
            setSelectedModelId(first[0]);
            // For relay, clear baseUrl so user must pick a platform
            setBaseUrl(isRelay ? '' : first[1].baseUrl);
            setTasks(first[1].defaultTasks);
        } else {
            setSelectedModelId('');
            setBaseUrl('');
            setTasks([]);
        }
    };

    const handleModelChange = (id: string) => {
        setSelectedModelId(id);
        const d = MODEL_DEFS[id];
        if (d) {
            setBaseUrl(d.baseUrl);
            setTasks(d.defaultTasks);
        }
    };

    const toggleTask = (id: string) => {
        setTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleSave = () => {
        const finalModelId = isCustomGroup ? customModelId : selectedModelId;
        if (!finalModelId) { alert('请选择或填写型号'); return; }
        if (isRelayGroup && !baseUrl) { alert('第三方中转需要填写 Base URL'); return; }

        const finalLabel = isCustomGroup
            ? (customLabel || customModelId)
            : (MODEL_DEFS[finalModelId]?.label || finalModelId);

        const config: ModelConfig = {
            id: existing?.model.id || `mc_${Date.now()}`,
            modelId: finalModelId,
            label: finalLabel,
            baseUrl,
            tasks,
            enabled: existing?.model.enabled ?? true,
            priority: existing?.model.priority ?? 0,
        };
        onSave(config, apiKey);
    };

    const overlay: React.CSSProperties = {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    };
    const modal: React.CSSProperties = {
        background: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '8px', padding: '22px 24px',
        width: '500px', maxWidth: '92vw', maxHeight: '82vh', overflowY: 'auto',
    };

    const stepHeader = (n: number, title: string) => (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>{isEdit ? '编辑模型' : `步骤 ${n}/3 — ${title}`}</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--vscode-descriptionForeground)' }} onClick={onClose}>✕</button>
            </div>
            <div style={{ height: '1px', background: 'var(--vscode-panel-border)' }} />
        </div>
    );

    return (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) { onClose(); } }}>
            <div style={modal}>
                {/* Step 1: Provider + model */}
                {step === 1 && (
                    <>
                        {stepHeader(1, '选择模型')}

                        <div style={{ marginBottom: '14px' }}>
                            <label style={s.label}>{lang === 'zh' ? '提供商' : 'Provider'}</label>
                            <select style={s.select} value={selectedGroup} onChange={e => handleGroupChange(e.target.value)}>
                                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        {!isCustomGroup && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={s.label}>{lang === 'zh' ? '型号' : 'Model'}</label>
                                {isRelayGroup ? (
                                    <select style={s.select} value={selectedModelId} onChange={e => handleModelChange(e.target.value)}>
                                        {(() => {
                                            const grouped: Record<string, [string, ModelDef][]> = {};
                                            modelsInGroup.forEach(([id, d]) => {
                                                (grouped[d.group] = grouped[d.group] || []).push([id, d]);
                                            });
                                            return Object.entries(grouped).map(([group, models]) => (
                                                <optgroup key={group} label={group}>
                                                    {models.map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
                                                </optgroup>
                                            ));
                                        })()}
                                    </select>
                                ) : (
                                    <select style={s.select} value={selectedModelId} onChange={e => handleModelChange(e.target.value)}>
                                        {modelsInGroup.map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
                                    </select>
                                )}
                                {def && <p style={s.hint}>{def.note}</p>}
                                {isRelayGroup && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={s.label}>{lang === 'zh' ? '中转平台（点击快速填入）' : 'Relay Platform (click to fill Base URL)'}</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                            {RELAY_PRESETS.map(r => (
                                                <button
                                                    key={r.name}
                                                    onClick={() => setBaseUrl(r.url)}
                                                    style={{
                                                        ...s.btnSecondary, fontSize: '11px', padding: '4px 10px',
                                                        background: baseUrl === r.url ? 'var(--vscode-button-background)' : undefined,
                                                        color: baseUrl === r.url ? 'var(--vscode-button-foreground)' : undefined,
                                                    }}
                                                >
                                                    {r.name}
                                                </button>
                                            ))}
                                        </div>
                                        {RELAY_PRESETS.map(r => baseUrl === r.url && (
                                            <p key={r.name} style={{ ...s.hint, marginTop: '6px' }}>
                                                {r.note} — <a href={r.site} style={{ color: 'var(--vscode-textLink-foreground)' }}>注册 / 获取 Key ↗</a>
                                            </p>
                                        ))}
                                        <div style={{ marginTop: '8px' }}>
                                            <label style={s.label}>Base URL</label>
                                            <input style={s.input} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://your-relay.com/v1" />
                                        </div>
                                    </div>
                                )}
                                {!isRelayGroup && def?.relay && (
                                    <p style={{ ...s.hint, color: 'var(--vscode-errorForeground)', marginTop: '6px' }}>
                                        此模型需要中转服务，下一步填写中转地址。
                                    </p>
                                )}
                            </div>
                        )}

                        {isCustomGroup && (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={s.label}>Model ID <span style={{ fontWeight: 400, opacity: 0.7 }}>(接口中使用的模型名称)</span></label>
                                    <input style={s.input} value={customModelId} onChange={e => setCustomModelId(e.target.value)} placeholder="e.g. gpt-4o / claude-3-5-sonnet-20241022" />
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={s.label}>显示名称 <span style={{ fontWeight: 400, opacity: 0.7 }}>(在列表里显示的名字)</span></label>
                                    <input style={s.input} value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. 我的专属模型" />
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button style={s.btnSecondary} onClick={onClose}>取消</button>
                            <button style={s.btnPrimary} onClick={() => setStep(2)} disabled={!isCustomGroup && !selectedModelId}>
                                下一步
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Tasks + Base URL */}
                {step === 2 && (
                    <>
                        {stepHeader(2, '任务分配')}

                        {isEdit && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={s.label}>Model ID <span style={{ fontWeight: 400, opacity: 0.7 }}>{`(可直接修改型号，如 ${GROUP_MODEL_EXAMPLES[selectedGroup] ?? 'glm-5'})`}</span></label>
                                <input
                                    style={s.input}
                                    value={isCustomGroup ? customModelId : selectedModelId}
                                    onChange={e => isCustomGroup ? setCustomModelId(e.target.value) : setSelectedModelId(e.target.value)}
                                    placeholder={GROUP_MODEL_EXAMPLES[selectedGroup] ?? '如 glm-5、deepseek-chat、MiniMax-M2.5'}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ ...s.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>
                                    {lang === 'zh' ? '任务类型（多选）' : 'Task Types (multi-select)'}
                                    <span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.65, marginLeft: '8px' }}>
                                        已按模型特点预设，可自由修改
                                    </span>
                                </span>
                                {def?.defaultTasks && (
                                    <button
                                        style={{ ...s.btnSecondary, padding: '2px 8px', fontSize: '10px', marginLeft: '8px' }}
                                        onClick={() => setTasks([...(def?.defaultTasks || [])])}
                                    >
                                        {lang === 'zh' ? '恢复默认' : 'Reset'}
                                    </button>
                                )}
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {TASK_TYPES.map(t => {
                                    const sel = tasks.includes(t.id);
                                    return (
                                        <span
                                            key={t.id}
                                            onClick={() => toggleTask(t.id)}
                                            style={{
                                                padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                                                background: sel ? 'var(--vscode-button-background)' : 'var(--vscode-input-background)',
                                                color: sel ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
                                                border: '1px solid var(--vscode-input-border)',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {lang === 'zh' ? t.zh : t.en}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={s.label}>
                                Base URL
                                {def?.relay && (
                                    <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--vscode-errorForeground)', marginLeft: '6px' }}>
                                        此模型需要填写中转服务地址
                                    </span>
                                )}
                            </label>
                            <input style={s.input} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.xxx.com/v1" />
                            <p style={s.hint}>
                                {def?.relay
                                    ? '推荐中转：OpenRouter (openrouter.ai) · 硅基流动 (siliconflow.cn)'
                                    : '已自动填入官方地址，如使用中转服务可修改。'
                                }
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                            <button style={s.btnPrimary} onClick={() => setStep(1)}>上一步</button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={s.btnSecondary} onClick={onClose}>取消</button>
                                <button style={s.btnPrimary} onClick={() => setStep(3)}>下一步</button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 3: API Key */}
                {step === 3 && (
                    <>
                        {stepHeader(3, 'API Key')}

                        <div style={{ marginBottom: '6px' }}>
                            <label style={s.label}>API Key</label>
                            <input type="password" style={s.input} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." />
                            <p style={s.hint}>加密存储，不会明文保存到磁盘。</p>
                        </div>

                        {/* API Key links by group */}
                        {(() => {
                            const links: Record<string, { text: string; url: string }> = {
                                'DeepSeek': { text: '申请 DeepSeek Key', url: 'https://platform.deepseek.com' },
                                'GLM (智谱)': { text: '申请智谱 Key', url: 'https://open.bigmodel.cn' },
                                'Qwen (通义)': { text: '申请通义 Key', url: 'https://dashscope.aliyun.com' },
                                'MiniMax': { text: '申请 MiniMax Key', url: 'https://api.minimax.chat' },
                                'Moonshot (Kimi)': { text: '申请 Kimi Key', url: 'https://platform.moonshot.cn' },
                                'OpenAI': { text: '申请 OpenAI Key', url: 'https://platform.openai.com/api-keys' },
                            };
                            const g = isEdit ? (MODEL_DEFS[existing!.model.modelId]?.group || '') : selectedGroup;
                            const link = links[g];
                            if (!link) { return null; }
                            return (
                                <p style={{ ...s.hint, marginTop: '10px' }}>
                                    还没有 Key？
                                    <a href={link.url} style={{ color: 'var(--vscode-textLink-foreground)', marginLeft: '4px', cursor: 'pointer' }}
                                        onClick={e => { e.preventDefault(); vscode.postMessage({ command: 'openUrl', url: link.url }); }}>
                                        {link.text}
                                    </a>
                                </p>
                            );
                        })()}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                            <button style={s.btnPrimary} onClick={() => setStep(2)}>上一步</button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={s.btnSecondary} onClick={onClose}>取消</button>
                                <button style={s.btnPrimary} onClick={handleSave}>保存</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── ConfigPanel ──────────────────────────────────────────────────────────────

export interface ConfigPanelProps { lang: 'zh' | 'en'; }

const ConfigPanel: React.FC<ConfigPanelProps> = ({ lang }) => {
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<{ model: ModelConfig; apiKey: string } | undefined>();
    const [showPricing, setShowPricing] = useState(false);
    const [showRouting, setShowRouting] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
    const [codexStatus, setCodexStatus] = useState<{ installed: boolean; version?: string; loggedIn?: boolean } | null>(null);
    const [geminiStatus, setGeminiStatus] = useState<{ installed: boolean; version?: string; loggedIn?: boolean } | null>(null);
    const hasAutoTested = React.useRef(false);

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.data.command === 'loadModelsV2') {
                const loadedModels: ModelConfig[] = ev.data.models || [];
                const loadedKeys: Record<string, string> = ev.data.apiKeys || {};
                setModels(loadedModels);
                setApiKeys(loadedKeys);
                // Only auto-test on first load, not on every tab switch
                if (!hasAutoTested.current) {
                    hasAutoTested.current = true;
                    setTimeout(() => {
                        loadedModels.forEach((m) => {
                            const key = loadedKeys[m.id];
                            if (!key || !m.baseUrl || !m.enabled) return;
                            const requestId = `autotest_${m.id}_${Date.now()}`;
                            vscode.postMessage({ command: 'testConnection', modelId: m.modelId, baseUrl: m.baseUrl, apiKey: key, requestId });
                        });
                    }, 2000);
                }
            }
            // Handle auto-test results (same handler as manual test)
            if (ev.data.command === 'testResult' && ev.data.requestId?.startsWith('autotest_')) {
                // Extract model config id from requestId: autotest_{configId}_{timestamp}
                const parts = ev.data.requestId.split('_');
                const configId = parts.slice(1, -1).join('_');
                setTestResults(prev => ({ ...prev, [configId]: { ok: ev.data.ok, msg: ev.data.ok ? '已连通' : (ev.data.msg || '失败') } }));
            }
            if (ev.data.command === 'geminiStatus') {
                setGeminiStatus({ installed: ev.data.installed, version: ev.data.version, loggedIn: ev.data.loggedIn });
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'getModelsV2' });
        vscode.postMessage({ command: 'getCodexStatus' });
        vscode.postMessage({ command: 'getGeminiStatus' });
        return () => window.removeEventListener('message', handler);
    }, []);

    const handleSave = useCallback((modelConfig: ModelConfig, apiKey: string) => {
        if (editTarget) {
            vscode.postMessage({ command: 'updateModel', id: modelConfig.id, patch: modelConfig, apiKey });
        } else {
            vscode.postMessage({ command: 'addModel', modelConfig, apiKey });
        }
        setShowModal(false);
        setEditTarget(undefined);
    }, [editTarget]);

    const handleEdit = (model: ModelConfig, key: string) => { setEditTarget({ model, apiKey: key }); setShowModal(true); };
    const handleRemove = (id: string) => vscode.postMessage({ command: 'removeModel', id });
    const handleToggle = (id: string, enabled: boolean) => {
        vscode.postMessage({ command: 'updateModel', id, patch: { enabled } });
        setModels(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
    };

    const enabled = models.filter(m => m.enabled).length;

    return (
        <div style={{ maxWidth: '700px', paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                        fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                        color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                    }}>
                        {lang === 'zh' ? '云端模型节点' : 'CLOUD EXPERT MODELS'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                        &gt; {enabled} {lang === 'zh' ? '个节点在线 · 自动路由已启用' : 'node(s) active · auto-routing engaged'}
                    </div>
                </div>
                <button
                    style={{ padding: '6px 14px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => { setEditTarget(undefined); setShowModal(true); }}
                >
                    {lang === 'zh' ? '[ + 添加节点 ]' : '[ + add_node ]'}
                </button>
            </div>

            {/* Grouped Models List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* We iterate exactly through the pre-defined GROUPS */}
                {GROUPS.map(groupName => {
                    const groupModelsInDef = Object.entries(MODEL_DEFS).filter(([, d]) => d.group === groupName);
                    // For relay/custom groups, they might not be strict GROUPS matching standard names, so handle dynamically.
                    // But standard groups like GLM, DeepSeek are fixed.
                    if (groupModelsInDef.length === 0) return null;

                    return (
                        <div key={groupName} style={{
                            padding: '16px',
                            background: 'var(--vscode-editor-background)',
                            border: '1px solid var(--vscode-panel-border)',
                            borderRadius: radius.sm,
                        }}>
                            {/* Provider header + group-level N/A or status */}
                            {(() => {
                                const anyConfigured = groupModelsInDef.some(([mid]) => models.find(m => m.modelId === mid));
                                const anyEnabled = groupModelsInDef.some(([mid]) => {
                                    const c = models.find(m => m.modelId === mid);
                                    return c?.enabled;
                                });
                                const groupStatus = !anyConfigured ? 'N/A' : (anyEnabled ? 'ON' : 'OFF');
                                const groupStatusColor = groupStatus === 'ON'
                                    ? 'var(--vscode-testing-iconPassed)'
                                    : groupStatus === 'OFF' ? 'var(--vscode-errorForeground)'
                                    : 'var(--vscode-descriptionForeground)';
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{
                                            fontWeight: 700, fontSize: '12px', fontFamily: 'monospace',
                                            letterSpacing: '0.5px', textTransform: 'uppercase',
                                            color: providerColors[groupName] || 'var(--vscode-editor-foreground)',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            <span>[ {groupName} ]</span>
                                        </span>
                                        <span style={{
                                            fontWeight: 700, fontSize: '11px', fontFamily: 'monospace',
                                            letterSpacing: '0.5px', color: groupStatusColor,
                                        }}>
                                            {groupStatus}
                                        </span>
                                    </div>
                                );
                            })()}

                            {/* Sub-models list */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {groupModelsInDef.map(([modelId, def]) => {
                                    const userConfig = models.find(m => m.modelId === modelId);
                                    const isConfigured = !!userConfig;
                                    const isEnabled = userConfig?.enabled;
                                    const testResult = userConfig ? testResults[userConfig.id] : undefined;

                                    const labelColor = isConfigured && isEnabled
                                        ? 'var(--vscode-textLink-foreground)'
                                        : 'var(--vscode-descriptionForeground)';

                                    return (
                                        <div
                                            key={modelId}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                fontFamily: 'monospace', fontSize: '11px',
                                            }}
                                        >
                                            <span
                                                onClick={() => {
                                                    if (userConfig) {
                                                        handleEdit(userConfig, apiKeys[userConfig.id] || '');
                                                    } else {
                                                        const newConfigObj: ModelConfig = {
                                                            id: `mc_${Date.now()}`,
                                                            modelId: modelId,
                                                            label: def.label,
                                                            baseUrl: def.baseUrl,
                                                            tasks: def.defaultTasks,
                                                            enabled: true,
                                                            priority: 0,
                                                        };
                                                        handleEdit(newConfigObj, '');
                                                    }
                                                }}
                                                style={{
                                                    color: labelColor,
                                                    fontWeight: isConfigured && isEnabled ? 700 : 400,
                                                    cursor: 'pointer',
                                                    borderBottom: '1px dashed transparent',
                                                }}
                                                title={isConfigured ? '点击编辑' : '点击配置'}
                                            >
                                                • {def.label}
                                            </span>

                                            {/* Delete button for configured models */}
                                            {isConfigured && (
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); handleRemove(userConfig!.id); }}
                                                    style={{
                                                        color: 'var(--vscode-errorForeground)',
                                                        cursor: 'pointer',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        opacity: 0.6,
                                                    }}
                                                    title="移除此模型配置"
                                                >
                                                    [×]
                                                </span>
                                            )}

                                            {testResult && !testResult.ok && isEnabled && (
                                                <span style={{ color: 'var(--vscode-errorForeground)', fontSize: '10px' }}>[ERR]</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Hint if nothing configured in this group */}
                            {!groupModelsInDef.some(([mid]) => models.find(m => m.modelId === mid)) && (
                                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', marginTop: '8px' }}>
                                    未配置 / Not Configured
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Third-Party Relay and Custom Configs (catch-all for items not matching GROUPS) */}
                {(() => {
                    const customModes = models.filter(m => {
                        const def = MODEL_DEFS[m.modelId];
                        return !def || !GROUPS.includes(def.group);
                    });
                    
                    if (customModes.length === 0) return null;

                    return (
                        <div style={{
                            padding: '16px',
                            background: 'var(--vscode-editor-background)',
                            border: '1px solid var(--vscode-panel-border)',
                            borderRadius: radius.sm,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{
                                    fontWeight: 700, fontSize: '12px', fontFamily: 'monospace',
                                    letterSpacing: '0.5px', textTransform: 'uppercase',
                                    color: 'var(--vscode-descriptionForeground)',
                                }}>
                                    [ THIRD-PARTY / CUSTOM ]
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {customModes.map((m) => {
                                    const isEnabled = m.enabled;
                                    const testResult = testResults[m.id];
                                    const statusColor = isEnabled ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-descriptionForeground)';
                                    const borderColor = isEnabled ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-panel-border)';

                                    return (
                                        <div
                                            key={m.id}
                                            onClick={() => handleEdit(m, apiKeys[m.id] || '')}
                                            style={{
                                                padding: '6px 12px',
                                                border: `1px solid ${borderColor}`,
                                                background: isEnabled ? 'rgba(16, 185, 129, 0.05)' : 'var(--vscode-editor-inactiveSelectionBackground)',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                opacity: !isEnabled ? 0.6 : 1,
                                                fontFamily: 'monospace',
                                                fontSize: '11px',
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: statusColor }}>API</span>
                                            <span style={{ color: 'var(--vscode-editor-foreground)' }}>{m.label}</span>
                                            <span style={{ color: statusColor, fontWeight: 700, letterSpacing: '0.5px', marginLeft: '4px' }}>
                                                {isEnabled ? 'ON' : 'OFF'}
                                            </span>
                                            {testResult && !testResult.ok && isEnabled && (
                                                <span style={{ color: 'var(--vscode-errorForeground)', marginLeft: '4px' }}>[ERR]</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Codex CLI (ChatGPT OAuth) Card */}
            <div style={{
                marginTop: '32px', padding: '16px', borderRadius: radius.sm,
                background: 'var(--vscode-editor-background)',
                border: `1px solid ${codexStatus?.installed ? 'rgba(16, 185, 129, 0.3)' : 'var(--vscode-panel-border)'}`,
                borderLeft: `3px solid ${codexStatus?.installed ? '#10B981' : 'var(--vscode-descriptionForeground)'}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                                CODEX_CLI (CHATGPT)
                            </span>
                            {codexStatus?.version && <span style={{ opacity: 0.6, fontSize: '11px', fontFamily: 'monospace' }}>v{codexStatus.version}</span>}
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                            {codexStatus === null ? '&gt; pinging...'
                                : codexStatus.installed
                                    ? (codexStatus.loggedIn ? '&gt; authenticated via OAuth · native agentic execution' : '&gt; installed · authentication required')
                                    : '&gt; uninstalled · zero-config ChatGPT access'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {!codexStatus?.installed && (
                            <button
                                style={{ padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => vscode.postMessage({ command: 'openTerminalWithCmd', cmd: 'npm install -g @openai/codex && codex login' })}
                            >
                                [ install ]
                            </button>
                        )}
                        {codexStatus?.installed && (
                            <button
                                style={{ padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => vscode.postMessage({ command: 'openTerminalWithCmd', cmd: 'codex login' })}
                            >
                                [ login ]
                            </button>
                        )}
                        <button style={{ padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => vscode.postMessage({ command: 'openUrl', url: 'https://github.com/openai/codex' })}>
                            [ docs ]
                        </button>
                    </div>
                </div>
                {codexStatus?.installed && codexStatus.loggedIn && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--vscode-panel-border)', fontSize: '11px', fontFamily: 'monospace', color: '#10B981', fontWeight: 600, letterSpacing: '0.5px' }}>
                        &gt; OK: NODE_ONLINE
                    </div>
                )}
            </div>

            {/* Gemini CLI Card */}
            <div style={{
                marginTop: '12px', padding: '16px', borderRadius: radius.sm,
                background: 'var(--vscode-editor-background)',
                border: `1px solid ${geminiStatus?.installed ? 'rgba(16, 185, 129, 0.3)' : 'var(--vscode-panel-border)'}`,
                borderLeft: `3px solid ${geminiStatus?.installed ? '#10B981' : 'var(--vscode-descriptionForeground)'}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                                GEMINI_CLI (GOOGLE)
                            </span>
                            {geminiStatus?.version && <span style={{ opacity: 0.6, fontSize: '11px', fontFamily: 'monospace' }}>v{geminiStatus.version}</span>}
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
                            {geminiStatus === null ? '&gt; pinging...'
                                : geminiStatus.installed
                                    ? (geminiStatus.loggedIn ? '&gt; authenticated via ADC · native agentic execution' : '&gt; installed · ADC authentication required')
                                    : '&gt; uninstalled · zero-config Gemini access'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {!geminiStatus?.installed && (
                            <button
                                style={{ padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => vscode.postMessage({ command: 'openTerminalWithCmd', cmd: 'npm install -g @google/gemini-cli && gemini' })}
                            >
                                [ install ]
                            </button>
                        )}
                        {geminiStatus?.installed && (
                            <button
                                style={{ padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => vscode.postMessage({ command: 'openTerminalWithCmd', cmd: 'gemini' })}
                            >
                                [ login ]
                            </button>
                        )}
                        <button style={{ padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => vscode.postMessage({ command: 'openUrl', url: 'https://github.com/google/gemini-cli' })}>
                            [ docs ]
                        </button>
                    </div>
                </div>
                {geminiStatus?.installed && geminiStatus.loggedIn && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--vscode-panel-border)', fontSize: '11px', fontFamily: 'monospace', color: '#10B981', fontWeight: 600, letterSpacing: '0.5px' }}>
                        &gt; OK: NODE_ONLINE
                    </div>
                )}
            </div>

            {/* Pricing Reference Table */}
            <div style={{ marginTop: '18px' }}>
                <button
                    onClick={() => setShowPricing(!showPricing)}
                    style={{
                        ...s.btnSecondary,
                        width: '100%', textAlign: 'left',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                >
                    <span>{lang === 'zh' ? '模型价格参考（OpenRouter 数据）' : 'Pricing Reference (OpenRouter Data)'}</span>
                    <span style={{ fontSize: '10px' }}>{showPricing ? '▲' : '▼'}</span>
                </button>
                {showPricing && (
                    <div style={{
                        marginTop: '6px', border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px', overflow: 'hidden',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: 'var(--vscode-editor-inactiveSelectionBackground)', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 10px', fontWeight: 600 }}>
                                        {lang === 'zh' ? '模型' : 'Model'}
                                    </th>
                                    <th style={{ padding: '6px 10px', fontWeight: 600 }}>
                                        {lang === 'zh' ? '厂商' : 'Provider'}
                                    </th>
                                    <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>
                                        {lang === 'zh' ? '输入 $/M' : 'Input $/M'}
                                    </th>
                                    <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>
                                        {lang === 'zh' ? '输出 $/M' : 'Output $/M'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {PRICE_TABLE.map((row, i) => (
                                    <tr key={row.id} style={{
                                        background: i % 2 === 0 ? 'transparent' : 'var(--vscode-editor-inactiveSelectionBackground)',
                                        borderTop: '1px solid var(--vscode-input-border)',
                                    }}>
                                        <td style={{ padding: '5px 10px' }}>{row.label}</td>
                                        <td style={{ padding: '5px 10px', color: providerColors[row.group] || 'inherit', fontWeight: 500 }}>{row.group}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            {formatPrice(row.pricing.input, lang)}
                                        </td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            {formatPrice(row.pricing.output, lang)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{
                            padding: '6px 10px', fontSize: '10px',
                            color: 'var(--vscode-descriptionForeground)',
                            borderTop: '1px solid var(--vscode-input-border)',
                        }}>
                            {lang === 'zh'
                                ? `价格来源：OpenRouter（2026-03），单位：人民币/百万 tokens（汇率 $1=¥${USD_TO_CNY}）。直连官方 API 价格可能不同。`
                                : 'Source: OpenRouter (2026-03). USD per million tokens. Direct API pricing may vary.'}
                        </div>
                    </div>
                )}
            </div>

            {/* Routing Recommendation Table */}
            <div style={{ marginTop: '18px' }}>
                <button
                    onClick={() => setShowRouting(!showRouting)}
                    style={{
                        ...s.btnSecondary,
                        width: '100%', textAlign: 'left',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                >
                    <span>{lang === 'zh' ? '路由推荐参考 — 各任务最佳模型' : 'Routing Reference (Best Model per Task)'}</span>
                    <span style={{ fontSize: '10px' }}>{showRouting ? '▲' : '▼'}</span>
                </button>
                {showRouting && (
                    <div style={{
                        marginTop: '6px', border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px', overflow: 'hidden',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: 'var(--vscode-editor-inactiveSelectionBackground)', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {lang === 'zh' ? '任务类型' : 'Task Type'}
                                    </th>
                                    <th style={{ padding: '6px 10px', fontWeight: 600 }}>
                                        {lang === 'zh' ? '推荐模型' : 'Recommended'}
                                    </th>
                                    <th style={{ padding: '6px 10px', fontWeight: 600 }}>
                                        {lang === 'zh' ? '原因' : 'Why'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {([
                                    [lang === 'zh' ? '代码生成' : 'Code Gen', [['DeepSeek', 'V3'], ['Qwen (通义)', 'Coder-Plus']], lang === 'zh' ? '性价比最高；代码专项同级' : 'Best cost-efficiency; code specialist'],
                                    [lang === 'zh' ? '调试 / 重构' : 'Debug', [['DeepSeek', 'V3'], ['Codex CLI', 'GPT-5']], lang === 'zh' ? '代码理解深入；CLI 终端利器' : 'Deep code comprehension; CLI powerhouse'],
                                    [lang === 'zh' ? '架构设计' : 'Architecture', [['GLM (智谱)', 'GLM-5'], ['DeepSeek', 'R1']], lang === 'zh' ? '企业级 Agentic；思维链推理' : 'Enterprise Agentic; CoT reasoning'],
                                    [lang === 'zh' ? '文档' : 'Docs', [['Qwen (通义)', 'Max'], ['DeepSeek', 'V3']], lang === 'zh' ? '中文文档最强；均衡首选' : 'Best Chinese docs; balanced'],
                                    [lang === 'zh' ? '翻译' : 'Translation', [['Qwen (通义)', 'Max'], ['DeepSeek', 'V3']], lang === 'zh' ? '中文第一；本地化适配强' : 'Chinese #1; Strong localization'],
                                    [lang === 'zh' ? 'UI / 前端' : 'UI & Frontend', [['MiniMax', 'M2.5'], ['Gemini CLI', 'Gemini']], lang === 'zh' ? '多模态视觉；CLI 深度推理' : 'Multimodal; CLI deep reasoning'],
                                    [lang === 'zh' ? '图像理解' : 'Vision', [['Gemini CLI', 'Gemini'], ['Qwen (通义)', 'VL-Max']], lang === 'zh' ? '百万 token 多模态' : 'Million token multimodal'],
                                    [lang === 'zh' ? '长文本' : 'Long Context', [['Moonshot (Kimi)', 'v1-128k'], ['Qwen (通义)', 'Max']], lang === 'zh' ? '256K MoE；超长上下文' : '256K MoE; ultra-long ctx'],
                                    [lang === 'zh' ? '推理' : 'Reasoning', [['DeepSeek', 'R1'], ['GLM (智谱)', 'GLM-5']], lang === 'zh' ? '思维链顶尖；ARC-AGI 高分' : 'CoT top; ARC-AGI high'],
                                    [lang === 'zh' ? '工具调用' : 'Tool Calling', [['Qwen (通义)', 'Max'], ['GLM (智谱)', 'GLM-5']], lang === 'zh' ? 'Function Calling 领先' : 'Function Calling leader'],
                                    [lang === 'zh' ? 'Agentic' : 'Agentic', [['MiniMax', 'M2.5'], ['Codex CLI', 'GPT-5']], lang === 'zh' ? 'SWE-bench 高分；终端自动化' : 'SWE-bench high; terminal auto'],
                                    [lang === 'zh' ? '终端 / DevOps' : 'Terminal', [['Codex CLI', 'GPT-5'], ['Gemini CLI', 'Gemini']], lang === 'zh' ? 'Terminal-Bench #1' : 'Terminal-Bench #1'],
                                ] as [string, [string, string][], string][]).map(([task, models, reason], i) => (
                                    <tr key={task} style={{
                                        background: i % 2 === 0 ? 'transparent' : 'var(--vscode-editor-inactiveSelectionBackground)',
                                        borderTop: '1px solid var(--vscode-input-border)',
                                    }}>
                                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', fontWeight: 500 }}>{task}</td>
                                        <td style={{ padding: '5px 10px', fontSize: '11px' }}>
                                            {models.map(([prov, name], j) => (
                                                <span key={j}>
                                                    {j > 0 && <span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>}
                                                    <span style={{
                                                        color: providerColors[prov] || 'inherit',
                                                        fontWeight: 600,
                                                    }}>{name}</span>
                                                </span>
                                            ))}
                                        </td>
                                        <td style={{ padding: '5px 10px', fontSize: '11px', opacity: 0.8 }}>{reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{
                            padding: '6px 10px', fontSize: '10px',
                            color: 'var(--vscode-descriptionForeground)',
                            borderTop: '1px solid var(--vscode-input-border)',
                        }}>
                            {lang === 'zh'
                                ? '以上仅为参考，实际路由取决于已配置的模型。L-Hub 支持所有 OpenAI 兼容接口，不限于上表。'
                                : 'These are recommendations only. Actual routing depends on your configured models. L-Hub supports any OpenAI-compatible model.'}
                        </div>
                    </div>
                )}
            </div>


            {showModal && (
                <AddEditModal
                    lang={lang} existing={editTarget}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditTarget(undefined); }}
                />
            )}
        </div>
    );
};

export default ConfigPanel;
