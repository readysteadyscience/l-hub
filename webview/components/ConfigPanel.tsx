import React, { useState, useEffect, useCallback } from 'react';
import { vscode } from '../vscode-api';

// ─── Shared Model Registry (inline, no vscode import) ──────────────────────

const TASK_TYPES = [
    { id: 'code_gen', zh: '💻 代码生成', en: '💻 Code Generation' },
    { id: 'code_review', zh: '🔍 代码审查/调试', en: '🔍 Code Review & Debug' },
    { id: 'architecture', zh: '🏗️ 架构设计', en: '🏗️ Architecture' },
    { id: 'documentation', zh: '📝 文档/注释', en: '📝 Documentation' },
    { id: 'translation', zh: '🌐 翻译/多语言', en: '🌐 Translation' },
    { id: 'ui_design', zh: '🎨 UI/前端', en: '🎨 UI & Frontend' },
    { id: 'vision', zh: '👁️ 图像理解', en: '👁️ Vision' },
    { id: 'long_context', zh: '📚 长文本分析', en: '📚 Long Context' },
    { id: 'math_reasoning', zh: '🧮 数学/推理', en: '🧮 Math & Reasoning' },
    { id: 'tool_calling', zh: '🔧 工具调用', en: '🔧 Tool Calling' },
    { id: 'creative', zh: '✍️ 创意写作', en: '✍️ Creative Writing' },
    { id: 'agentic', zh: '🤖 Agentic', en: '🤖 Agentic Tasks' },
];

interface ModelDef { label: string; group: string; baseUrl: string; defaultTasks: string[]; note: string; isRelay?: boolean; }

const MODEL_DEFS: Record<string, ModelDef> = {
    'deepseek-chat': { label: 'DeepSeek-V3', group: '🇨🇳 DeepSeek', baseUrl: 'https://api.deepseek.com/v1', defaultTasks: ['code_gen', 'code_review', 'math_reasoning'], note: 'SWE-bench Top 5，性价比最高' },
    'deepseek-reasoner': { label: 'DeepSeek-R1', group: '🇨🇳 DeepSeek', baseUrl: 'https://api.deepseek.com/v1', defaultTasks: ['math_reasoning', 'architecture', 'code_gen'], note: '推理专属，数学/科学最强' },
    'deepseek-coder': { label: 'DeepSeek-Coder', group: '🇨🇳 DeepSeek', baseUrl: 'https://api.deepseek.com/v1', defaultTasks: ['code_gen', 'code_review'], note: '代码专属，自动补全顶尖' },
    'glm-4': { label: 'GLM-4', group: '🇨🇳 GLM (智谱)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultTasks: ['architecture', 'agentic', 'tool_calling', 'long_context'], note: '工具调用 90.6%，Agentic 最强' },
    'glm-4-flash': { label: 'GLM-4-Flash (免费)', group: '🇨🇳 GLM (智谱)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultTasks: ['code_gen', 'tool_calling'], note: '速度极快，免费额度大' },
    'glm-z1': { label: 'GLM-Z1 (推理增强)', group: '🇨🇳 GLM (智谱)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultTasks: ['math_reasoning', 'architecture'], note: '推理增强，复杂工程分析' },
    'qwen-max': { label: 'Qwen-Max', group: '🇨🇳 Qwen (通义)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultTasks: ['translation', 'documentation', 'tool_calling'], note: 'LMArena 全球前 3，中文最强' },
    'qwen-plus': { label: 'Qwen-Plus', group: '🇨🇳 Qwen (通义)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultTasks: ['translation', 'code_gen', 'documentation'], note: '中文与代码均衡，性价比好' },
    'qwen-turbo': { label: 'Qwen-Turbo (快速)', group: '🇨🇳 Qwen (通义)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultTasks: ['translation', 'documentation'], note: '最快速度，批量文档处理' },
    'abab6.5-chat': { label: 'MiniMax abab6.5', group: '🇨🇳 MiniMax', baseUrl: 'https://api.minimax.chat/v1', defaultTasks: ['ui_design', 'creative', 'long_context'], note: '100 tokens/s，内容生成最快' },
    'MiniMax-Text-01': { label: 'MiniMax-M1 (Text-01)', group: '🇨🇳 MiniMax', baseUrl: 'https://api.minimax.chat/v1', defaultTasks: ['long_context', 'code_gen', 'math_reasoning'], note: '1M token 上下文，长文本推理' },
    'moonshot-v1-128k': { label: 'Kimi 128K (Moonshot)', group: '🇨🇳 Moonshot', baseUrl: 'https://api.moonshot.cn/v1', defaultTasks: ['long_context', 'translation', 'documentation'], note: '128K 超长上下文，中文文档优秀' },
    'yi-large': { label: 'Yi-Large (零一万物)', group: '🇨🇳 01.AI (Yi)', baseUrl: 'https://api.lingyiwanwu.com/v1', defaultTasks: ['translation', 'code_gen'], note: '多语言理解强，高性价比' },
    'gpt-4o': { label: 'GPT-4o', group: '🌐 OpenAI (中转)', baseUrl: '', defaultTasks: ['vision', 'tool_calling', 'code_gen', 'architecture'], note: '多模态标杆，Function Calling 标准', isRelay: true },
    'gpt-4o-mini': { label: 'GPT-4o-mini', group: '🌐 OpenAI (中转)', baseUrl: '', defaultTasks: ['code_gen', 'tool_calling'], note: '低成本高性能替代', isRelay: true },
    'claude-3-5-sonnet-20241022': { label: 'Claude Sonnet', group: '🌐 Anthropic (中转)', baseUrl: '', defaultTasks: ['architecture', 'long_context', 'creative', 'code_review'], note: '复杂推理最深，长文档专家', isRelay: true },
    'claude-3-opus-20240229': { label: 'Claude Opus', group: '🌐 Anthropic (中转)', baseUrl: '', defaultTasks: ['architecture', 'math_reasoning', 'long_context', 'creative'], note: '旗舰推理能力，最复杂分析', isRelay: true },
    'gemini-1.5-pro': { label: 'Gemini 1.5 Pro', group: '🌐 Google (中转)', baseUrl: '', defaultTasks: ['vision', 'long_context', 'code_gen'], note: '1M+ token，多模态，Google Research', isRelay: true },
    'gemini-2.0-flash': { label: 'Gemini 2.0 Flash', group: '🌐 Google (中转)', baseUrl: '', defaultTasks: ['vision', 'code_gen', 'tool_calling'], note: '极速多模态，高性价比', isRelay: true },
    'meta-llama/llama-3.1-70b-instruct': { label: 'Llama 3.1 70B', group: '🌐 Meta (中转)', baseUrl: '', defaultTasks: ['code_gen', 'translation'], note: '开源最强，指令跟随出色', isRelay: true },
    'mistral-large-latest': { label: 'Mistral Large', group: '🌐 Mistral (中转)', baseUrl: '', defaultTasks: ['translation', 'tool_calling', 'code_gen'], note: '欧洲隐私合规，多语言', isRelay: true },
    '__custom__': { label: '自定义模型 / Custom Model', group: '🔌 自定义 / Custom', baseUrl: '', defaultTasks: [], note: '填入任意 OpenAI 兼容接口', isRelay: true },
};

const GROUPS = ['🇨🇳 DeepSeek', '🇨🇳 GLM (智谱)', '🇨🇳 Qwen (通义)', '🇨🇳 MiniMax', '🇨🇳 Moonshot', '🇨🇳 01.AI (Yi)', '🌐 OpenAI (中转)', '🌐 Anthropic (中转)', '🌐 Google (中转)', '🌐 Meta (中转)', '🌐 Mistral (中转)', '🔌 自定义 / Custom'];

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModelConfig { id: string; modelId: string; label: string; baseUrl: string; tasks: string[]; enabled: boolean; priority: number; }

// ─── Task chip colors ────────────────────────────────────────────────────────

const TASK_COLORS: Record<string, string> = {
    code_gen: '#1e88e5', code_review: '#00897b', architecture: '#7b1fa2',
    documentation: '#558b2f', translation: '#e65100', ui_design: '#ad1457',
    vision: '#6a1b9a', long_context: '#0277bd', math_reasoning: '#2e7d32',
    tool_calling: '#4527a0', creative: '#d84315', agentic: '#37474f',
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = { background: 'var(--vscode-editor-inactiveSelectionBackground)', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px', border: '1px solid var(--vscode-panel-border)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: '4px', boxSizing: 'border-box', fontSize: '13px' };
const btnPrimary: React.CSSProperties = { padding: '8px 18px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };
const btnSecondary: React.CSSProperties = { padding: '7px 14px', background: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };

// ─── TaskChip ────────────────────────────────────────────────────────────────

const TaskChip: React.FC<{ id: string; lang: string }> = ({ id, lang }) => {
    const t = TASK_TYPES.find(t => t.id === id);
    if (!t) { return null; }
    return (
        <span style={{ display: 'inline-block', margin: '2px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: TASK_COLORS[id] || '#555', color: '#fff', whiteSpace: 'nowrap' }}>
            {lang === 'zh' ? t.zh : t.en}
        </span>
    );
};

// ─── ModelCard ───────────────────────────────────────────────────────────────

const ModelCard: React.FC<{ model: ModelConfig; apiKey: string; lang: string; onEdit: (m: ModelConfig, key: string) => void; onRemove: (id: string) => void; onToggle: (id: string, enabled: boolean) => void; }> =
    ({ model, apiKey, lang, onEdit, onRemove, onToggle }) => {
        const def = MODEL_DEFS[model.modelId];
        const group = def?.group || 'Custom';
        return (
            <div style={{ ...card, opacity: model.enabled ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{model.label}</span>
                            <span style={{ fontSize: '11px', background: 'var(--vscode-badge-background)', color: 'var(--vscode-badge-foreground)', padding: '1px 7px', borderRadius: '10px' }}>{group}</span>
                        </div>
                        {def && <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', margin: '4px 0 8px 0' }}>{def.note}</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                            {model.tasks.map(t => <TaskChip key={t} id={t} lang={lang} />)}
                            {model.tasks.length === 0 && <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>无任务分配</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {/* Toggle */}
                        <span
                            title={model.enabled ? '禁用' : '启用'}
                            onClick={() => onToggle(model.id, !model.enabled)}
                            style={{ cursor: 'pointer', fontSize: '18px', userSelect: 'none' }}
                        >{model.enabled ? '✅' : '⭕'}</span>
                        {/* Edit */}
                        <span title="编辑" onClick={() => onEdit(model, apiKey)} style={{ cursor: 'pointer', fontSize: '15px', userSelect: 'none' }}>✏️</span>
                        {/* Delete */}
                        <span title="删除" onClick={() => { if (window.confirm(`删除 ${model.label}？`)) { onRemove(model.id); } }} style={{ cursor: 'pointer', fontSize: '15px', userSelect: 'none' }}>🗑️</span>
                    </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>🔗 {model.baseUrl || '(使用中转地址)'}</span>
                    <span>🔑 {apiKey ? '已配置' : '⚠️ 未配置'}</span>
                </div>
            </div>
        );
    };

// ─── AddEditModal ────────────────────────────────────────────────────────────

const AddEditModal: React.FC<{
    lang: string;
    existing?: { model: ModelConfig; apiKey: string };
    onSave: (model: ModelConfig, apiKey: string) => void;
    onClose: () => void;
}> = ({ lang, existing, onSave, onClose }) => {
    const isEdit = !!existing;
    const [selectedGroup, setSelectedGroup] = useState(existing ? (MODEL_DEFS[existing.model.modelId]?.group || GROUPS[0]) : GROUPS[0]);
    const [selectedModelId, setSelectedModelId] = useState(existing?.model.modelId || '');
    const [customModelId, setCustomModelId] = useState(existing?.model.modelId || '');
    const [customLabel, setCustomLabel] = useState(existing?.model.label || '');
    const [baseUrl, setBaseUrl] = useState(existing?.model.baseUrl || '');
    const [tasks, setTasks] = useState<string[]>(existing?.model.tasks || []);
    const [apiKey, setApiKey] = useState(existing?.apiKey || '');
    const [step, setStep] = useState(isEdit ? 2 : 1);

    const modelsInGroup = Object.entries(MODEL_DEFS).filter(([, d]) => d.group === selectedGroup);
    const isCustomGroup = selectedGroup === '🔌 自定义 / Custom';
    const effectiveModelId = isCustomGroup ? customModelId : selectedModelId;
    const def = MODEL_DEFS[effectiveModelId];

    const handleGroupChange = (g: string) => {
        setSelectedGroup(g);
        const first = Object.entries(MODEL_DEFS).find(([, d]) => d.group === g);
        if (first) {
            setSelectedModelId(first[0]);
            setBaseUrl(first[1].baseUrl);
            setTasks(first[1].defaultTasks);
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
        const finalLabel = isCustomGroup ? (customLabel || customModelId) : (MODEL_DEFS[finalModelId]?.label || finalModelId);
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

    const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
    const modal: React.CSSProperties = { background: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: '10px', padding: '24px', width: '520px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' };

    return (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) { onClose(); } }}>
            <div style={modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>{isEdit ? '✏️ 编辑模型' : '➕ 添加模型'}</h3>
                    <span style={{ cursor: 'pointer', fontSize: '18px' }} onClick={onClose}>✕</span>
                </div>

                {/* Step 1: Provider group + Model */}
                {step === 1 && (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                📂 {lang === 'zh' ? '选择提供商分组' : 'Provider Group'}
                            </label>
                            <select value={selectedGroup} onChange={e => handleGroupChange(e.target.value)} style={{ ...inputStyle }}>
                                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        {!isCustomGroup && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                    🤖 {lang === 'zh' ? '选择模型型号' : 'Select Model'}
                                </label>
                                <select value={selectedModelId} onChange={e => handleModelChange(e.target.value)} style={{ ...inputStyle }}>
                                    {modelsInGroup.map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
                                </select>
                                {def && <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>{def.note}</p>}
                            </div>
                        )}

                        {isCustomGroup && (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>模型 ID (Model Name)</label>
                                    <input style={inputStyle} value={customModelId} onChange={e => setCustomModelId(e.target.value)} placeholder="e.g. gpt-4o / claude-3-5-sonnet / llama-3.1-70b" />
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>显示名称 (Display Label)</label>
                                    <input style={inputStyle} value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. My GPT-4o via OpenRouter" />
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button style={btnSecondary} onClick={onClose}>取消</button>
                            <button style={btnPrimary} onClick={() => setStep(2)} disabled={!isCustomGroup && !selectedModelId}>下一步 →</button>
                        </div>
                    </div>
                )}

                {/* Step 2: Task types */}
                {step === 2 && (
                    <div>
                        <div style={{ marginBottom: '4px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                                🎯 {lang === 'zh' ? '分配任务类型（多选）' : 'Assign Task Types (multi-select)'}
                                <span style={{ fontWeight: 'normal', color: 'var(--vscode-descriptionForeground)', marginLeft: '8px' }}>
                                    {lang === 'zh' ? '已为此模型预设默认值，可自定义' : 'Defaults pre-filled for this model, feel free to adjust'}
                                </span>
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {TASK_TYPES.map(t => {
                                    const selected = tasks.includes(t.id);
                                    return (
                                        <span
                                            key={t.id}
                                            onClick={() => toggleTask(t.id)}
                                            style={{
                                                padding: '5px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px',
                                                background: selected ? (TASK_COLORS[t.id] || '#555') : 'var(--vscode-input-background)',
                                                color: selected ? '#fff' : 'var(--vscode-descriptionForeground)',
                                                border: `1px solid ${selected ? 'transparent' : 'var(--vscode-input-border)'}`,
                                                userSelect: 'none', transition: 'all 0.15s',
                                            }}
                                        >
                                            {lang === 'zh' ? t.zh : t.en}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                🔗 Base URL
                                {def?.isRelay && <span style={{ color: '#e65100', marginLeft: '6px' }}>（中转模型：请填写中转服务地址）</span>}
                            </label>
                            <input style={inputStyle} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                            {!isEdit && <button style={btnSecondary} onClick={() => setStep(1)}>← 上一步</button>}
                            {isEdit && <div />}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={btnSecondary} onClick={onClose}>取消</button>
                                <button style={btnPrimary} onClick={() => setStep(3)}>下一步 →</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: API Key */}
                {step === 3 && (
                    <div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>🔑 API Key</label>
                            <input type="password" style={inputStyle} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." />
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                Key 加密存储，不会明文保存。
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                            <button style={btnSecondary} onClick={() => setStep(2)}>← 上一步</button>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={btnSecondary} onClick={onClose}>取消</button>
                                <button style={btnPrimary} onClick={handleSave}>✅ 保存</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── ConfigPanel (main) ──────────────────────────────────────────────────────

export interface ConfigPanelProps { lang: 'zh' | 'en'; }

const ConfigPanel: React.FC<ConfigPanelProps> = ({ lang }) => {
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<{ model: ModelConfig; apiKey: string } | undefined>();

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            const msg = ev.data;
            if (msg.command === 'loadModelsV2') {
                setModels(msg.models || []);
                setApiKeys(msg.apiKeys || {});
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'getModelsV2' });
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

    const handleEdit = (model: ModelConfig, key: string) => {
        setEditTarget({ model, apiKey: key });
        setShowModal(true);
    };

    const handleRemove = (id: string) => {
        vscode.postMessage({ command: 'removeModel', id });
    };

    const handleToggle = (id: string, enabled: boolean) => {
        vscode.postMessage({ command: 'updateModel', id, patch: { enabled } });
        setModels(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
    };

    const enabledCount = models.filter(m => m.enabled).length;

    return (
        <div style={{ maxWidth: '750px', paddingBottom: '40px', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>🧠 {lang === 'zh' ? '模型管理' : 'Model Management'}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                        {lang === 'zh'
                            ? `${enabledCount} 个模型已启用 · 每个任务类型由对应专家模型分流处理`
                            : `${enabledCount} models enabled · Each task type is routed to its designated specialist model`}
                    </p>
                </div>
                <button
                    style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    onClick={() => { setEditTarget(undefined); setShowModal(true); }}
                >
                    ➕ {lang === 'zh' ? '添加模型' : 'Add Model'}
                </button>
            </div>

            {/* Model list */}
            {models.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--vscode-descriptionForeground)', border: '2px dashed var(--vscode-panel-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
                    <div style={{ fontSize: '15px', marginBottom: '8px' }}>{lang === 'zh' ? '还没有配置任何模型' : 'No models configured yet'}</div>
                    <div style={{ fontSize: '13px' }}>{lang === 'zh' ? '点击「添加模型」开始配置' : 'Click "Add Model" to get started'}</div>
                </div>
            ) : (
                models.map(m => (
                    <ModelCard
                        key={m.id}
                        model={m}
                        apiKey={apiKeys[m.id] || ''}
                        lang={lang}
                        onEdit={handleEdit}
                        onRemove={handleRemove}
                        onToggle={handleToggle}
                    />
                ))
            )}

            {/* Info footer */}
            <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--vscode-textBlockQuote-background)', borderRadius: '6px', borderLeft: '3px solid var(--vscode-activityBarBadge-background)', fontSize: '12px', color: 'var(--vscode-descriptionForeground)', lineHeight: '1.6' }}>
                {lang === 'zh'
                    ? '💡 路由逻辑：收到请求时，L-Hub 根据任务类型找出所有已启用的对应模型，按优先级选用首个。相同任务分配多个模型时，排在最上方的优先级最高。'
                    : '💡 Routing: When a request arrives, L-Hub finds all enabled models matching the task type and uses the highest-priority one. Models listed first have higher priority among same-task entries.'}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <AddEditModal
                    lang={lang}
                    existing={editTarget}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditTarget(undefined); }}
                />
            )}
        </div>
    );
};

export default ConfigPanel;
