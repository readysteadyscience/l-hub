import React, { useState, useEffect, useCallback } from 'react';
import { vscode } from '../vscode-api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelConfig {
    id: string;
    modelId: string;
    label: string;
    baseUrl: string;
    tasks: string[];
    enabled: boolean;
    priority: number;
}

// ─── Task Types ───────────────────────────────────────────────────────────────

const TASK_TYPES = [
    { id: 'code_gen', zh: '代码生成', en: 'Code Generation' },
    { id: 'code_review', zh: '调试 / 重构', en: 'Debug & Refactor' },
    { id: 'architecture', zh: '架构设计', en: 'Architecture' },
    { id: 'documentation', zh: '文档 / 注释', en: 'Documentation' },
    { id: 'translation', zh: '翻译', en: 'Translation' },
    { id: 'ui_design', zh: 'UI / 前端', en: 'UI & Frontend' },
    { id: 'vision', zh: '图像理解', en: 'Vision' },
    { id: 'long_context', zh: '长文本分析', en: 'Long Context' },
    { id: 'math_reasoning', zh: '数学 / 推理', en: 'Math & Reasoning' },
    { id: 'tool_calling', zh: '工具调用', en: 'Tool Calling' },
    { id: 'creative', zh: '创意写作', en: 'Creative Writing' },
    { id: 'agentic', zh: 'Agentic', en: 'Agentic Tasks' },
];

// ─── Model Registry ───────────────────────────────────────────────────────────

interface ModelDef {
    label: string;
    group: string;
    baseUrl: string;
    defaultTasks: string[];
    note: string;
    relay?: boolean;
    /** OpenRouter price as of 2026-03, USD per 1M tokens */
    pricing?: { input: number; output: number };
}

const MODEL_DEFS: Record<string, ModelDef> = {
    // ─── DeepSeek ─────────────────────────────────────────────────────────────
    'deepseek-chat': {
        label: 'DeepSeek-V3 (推荐)',
        group: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'math_reasoning'],
        note: '最新 V3.2（2025-12）综合能力强，性价比最高',
        pricing: { input: 0.32, output: 0.89 },
    },
    'deepseek-reasoner': {
        label: 'DeepSeek-R1 (推理)',
        group: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['math_reasoning', 'architecture', 'code_review'],
        note: 'R1 深度推理，思维链分析、数学、规划',
        pricing: { input: 0.70, output: 2.50 },
    },
    // ─── GLM (智谱) ────────────────────────────────────────────────────────────
    'glm-5': {
        label: 'GLM-5 (推荐)',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['architecture', 'agentic', 'tool_calling', 'code_gen'],
        note: '最新旗舰（2026-02），编程与 Agentic 能力接近 Claude Opus',
        pricing: { input: 1.50, output: 6.00 },
    },
    // ─── Qwen (通义) ──────────────────────────────────────────────────────────
    'qwen-max': {
        label: 'Qwen-Max (推荐)',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation', 'tool_calling', 'code_gen'],
        note: '通义最新旗舰（Qwen3.5），中文理解与翻译最强',
        pricing: { input: 0.50, output: 4.00 },
    },
    'qwen-coder-plus': {
        label: 'Qwen-Coder-Plus',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic'],
        note: '代码专项旗舰，Agentic 编程与工具调用',
        pricing: { input: 0.25, output: 2.00 },
    },
    // ─── MiniMax ──────────────────────────────────────────────────────────────
    'MiniMax-M2.5': {
        label: 'MiniMax-M2.5 (推荐)',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling', 'long_context'],
        note: '最新旗舰（2025-12），SWE-bench 80.2%，Agentic 顶尖',
        pricing: { input: 0.40, output: 1.20 },
    },
    'MiniMax-M2.5-highspeed': {
        label: 'MiniMax-M2.5 HighSpeed',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['code_gen', 'documentation'],
        note: 'M2.5 高速版，响应更快，适合高频调用',
        pricing: { input: 0.40, output: 1.20 },
    },
    // ─── Kimi K2 ──────────────────────────────────────────────────────────────
    'kimi-k2-instruct': {
        label: 'Kimi K2.5 (推荐)',
        group: 'Kimi K2',
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling', 'long_context'],
        note: '最新 K2.5（2026-01），1T MoE，256K 上下文，Agentic 顶尖',
        pricing: { input: 1.20, output: 4.80 },
    },
    // ─── OpenAI ───────────────────────────────────────────────────────────────
    'gpt-5.1': {
        label: 'GPT-5.1 (推荐)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'vision', 'architecture', 'long_context'],
        note: '最新旗舰，超长上下文，复杂推理与多模态，官方直连',
        pricing: { input: 1.25, output: 10.00 },
    },
    'gpt-5.3-codex': {
        label: 'GPT-5.3 Codex (编程)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic', 'tool_calling'],
        note: 'Terminal-Bench #1，Agentic 编程与 DevOps 顶尖，官方直连',
        pricing: { input: 1.75, output: 14.00 },
    },
    // ─── Anthropic (Claude) ───────────────────────────────────────────────────
    'claude-opus-4-6': {
        label: 'Claude Opus 4.6 (推荐)',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['architecture', 'agentic', 'code_review', 'long_context'],
        note: '最新旗舰（2026-02），全球编程最强，企业级 Agentic，官方直连',
        pricing: { input: 15.00, output: 75.00 },
    },
    'claude-sonnet-4-6': {
        label: 'Claude Sonnet 4.6',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'creative', 'architecture', 'documentation'],
        note: '最新（2026-02），性能与成本最佳平衡，通用主力，官方直连',
        pricing: { input: 3.00, output: 15.00 },
    },
    'claude-opus-4-5': {
        label: 'Claude Opus 4.5',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_review', 'architecture', 'agentic'],
        note: 'SWE-bench 72.5% 编程顶尖（2025-05），官方直连',
        pricing: { input: 15.00, output: 75.00 },
    },
    'claude-sonnet-4-5': {
        label: 'Claude Sonnet 4.5',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'creative', 'documentation'],
        note: '均衡旗舰（2025-05），代码与内容创作首选，官方直连',
        pricing: { input: 3.00, output: 15.00 },
    },
    // ─── Google Gemini ────────────────────────────────────────────────────────
    'gemini-3.1-flash': {
        label: 'Gemini 3.1 Flash (推荐)',
        group: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['vision', 'code_gen', 'tool_calling', 'long_context'],
        note: '最新 Flash（2026），速度快成本低，多模态全能，官方直连',
        pricing: { input: 0.25, output: 1.00 },
    },
    'gemini-3.1-pro-preview': {
        label: 'Gemini 3.1 Pro Preview',
        group: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['math_reasoning', 'architecture', 'long_context', 'vision'],
        note: '顶级推理，百万 token 上下文，官方直连',
        pricing: { input: 1.25, output: 5.00 },
    },
    'gemini-3-image': {
        label: 'Gemini Image Gen (生图)',
        group: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['vision', 'creative', 'ui_design'],
        note: '专用图像生成与编辑（Imagen 3 驱动），官方直连',
        pricing: { input: 0.25, output: 1.50 },
    },
    // ─── Mistral ──────────────────────────────────────────────────────────────
    'mistral-large-latest': {
        label: 'Mistral Large 3 (推荐)',
        group: 'Mistral',
        baseUrl: 'https://api.mistral.ai/v1',
        defaultTasks: ['translation', 'tool_calling', 'code_gen'],
        note: '欧洲隐私合规，多语言优秀，官方直连',
        pricing: { input: 2.00, output: 6.00 },
    },
    // ─── Meta Llama (中转) ────────────────────────────────────────────────────
    'meta-llama/llama-3.3-70b-instruct': {
        label: 'Llama 3.3 70B',
        group: 'Meta (Llama) — 需中转',
        baseUrl: '',
        defaultTasks: ['code_gen', 'translation'],
        note: '业界最强开源模型，需通过 OpenRouter / 硅基流动等中转',
        relay: true,
    },
    // ─── API 聚合平台 ─────────────────────────────────────────────────────────
    '__openrouter__': {
        label: 'OpenRouter',
        group: 'API 聚合平台',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultTasks: ['code_gen', 'architecture', 'translation'],
        note: '全球最大聚合（500+ 模型）。Model ID 格式：openai/gpt-5.1 · anthropic/claude-sonnet-4-6',
        relay: true,
    },
    '__yibuapi__': {
        label: '一步API',
        group: 'API 聚合平台',
        baseUrl: 'https://api.yibuapi.com/v1',
        defaultTasks: ['code_gen', 'translation'],
        note: '国内聚合，原价调用 GPT/Claude/Gemini/DeepSeek/Qwen/Kimi，无需科学上网',
        relay: true,
    },
    '__dmxapi__': {
        label: 'DMXAPI',
        group: 'API 聚合平台',
        baseUrl: 'https://www.dmxapi.cn/v1',
        defaultTasks: ['code_gen', 'translation'],
        note: '国内稳定聚合，Model ID 与官方一致',
        relay: true,
    },
    // ─── 自定义 ───────────────────────────────────────────────────────────────
    '__custom__': {
        label: '自定义模型',
        group: '自定义接口',
        baseUrl: '',
        defaultTasks: [],
        note: '任意兼容 OpenAI 接口的模型（中转、私有部署等）',
        relay: true,
    },
};

const GROUPS = [
    'DeepSeek',
    'GLM (智谱)',
    'Qwen (通义)',
    'MiniMax',
    'Kimi K2',
    'OpenAI',
    'Anthropic (Claude)',
    'Google (Gemini)',
    'Mistral',
    'Meta (Llama) — 需中转',
    'API 聚合平台',
    '自定义接口',
];

/** All models with known pricing, for the reference table */
const PRICE_TABLE = Object.entries(MODEL_DEFS)
    .filter(([, d]) => d.pricing)
    .sort((a, b) => (a[1].pricing!.input - b[1].pricing!.input))
    .map(([id, d]) => ({ id, label: d.label, group: d.group, pricing: d.pricing! }));

// ─── Shared Styles ────────────────────────────────────────────────────────────

const s = {
    card: {
        background: 'var(--vscode-editor-inactiveSelectionBackground)',
        borderRadius: '6px',
        padding: '12px 14px',
        marginBottom: '8px',
        border: '1px solid var(--vscode-panel-border)',
    } as React.CSSProperties,
    input: {
        width: '100%',
        padding: '6px 9px',
        background: 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '4px',
        boxSizing: 'border-box' as const,
        fontSize: '13px',
    } as React.CSSProperties,
    select: {
        width: '100%',
        padding: '6px 9px',
        background: 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '4px',
        boxSizing: 'border-box' as const,
        fontSize: '13px',
    } as React.CSSProperties,
    btnPrimary: {
        padding: '7px 16px',
        background: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600' as const,
    } as React.CSSProperties,
    btnSecondary: {
        padding: '6px 13px',
        background: 'transparent',
        color: 'var(--vscode-descriptionForeground)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
    } as React.CSSProperties,
    label: {
        display: 'block',
        marginBottom: '5px',
        fontSize: '12px',
        fontWeight: '600' as const,
        color: 'var(--vscode-editor-foreground)',
    } as React.CSSProperties,
    hint: {
        margin: '4px 0 0',
        fontSize: '11px',
        color: 'var(--vscode-descriptionForeground)',
    } as React.CSSProperties,
};

// ─── TaskBadge ────────────────────────────────────────────────────────────────

const TaskBadge: React.FC<{ id: string; lang: string }> = ({ id, lang }) => {
    const t = TASK_TYPES.find(t => t.id === id);
    if (!t) { return null; }
    return (
        <span style={{
            display: 'inline-block',
            margin: '2px 3px 2px 0',
            padding: '1px 7px',
            borderRadius: '3px',
            fontSize: '11px',
            background: 'var(--vscode-badge-background)',
            color: 'var(--vscode-badge-foreground)',
            whiteSpace: 'nowrap',
        }}>
            {lang === 'zh' ? t.zh : t.en}
        </span>
    );
};

// ─── ModelCard ────────────────────────────────────────────────────────────────

const ModelCard: React.FC<{
    model: ModelConfig;
    apiKey: string;
    lang: string;
    onEdit: (m: ModelConfig, key: string) => void;
    onRemove: (id: string) => void;
    onToggle: (id: string, enabled: boolean) => void;
}> = ({ model, apiKey, lang, onEdit, onRemove, onToggle }) => {
    const def = MODEL_DEFS[model.modelId];
    return (
        <div style={{ ...s.card, opacity: model.enabled ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name + provider + price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{model.label}</span>
                        <span style={{ fontSize: '11px', opacity: 0.65 }}>{def?.group || model.modelId}</span>
                        {def?.pricing && (
                            <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', background: 'var(--vscode-input-background)', border: '1px solid var(--vscode-input-border)', borderRadius: '3px', padding: '0 5px' }}>
                                ${def.pricing.input.toFixed(2)} / ${def.pricing.output.toFixed(2)} per M
                            </span>
                        )}
                    </div>
                    {/* Description */}
                    {def && (
                        <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', margin: '3px 0 7px' }}>
                            {def.note}
                        </div>
                    )}
                    {/* Task badges */}
                    <div>
                        {model.tasks.length > 0
                            ? model.tasks.map(t => <TaskBadge key={t} id={t} lang={lang} />)
                            : <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>未分配任务</span>
                        }
                    </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                        style={{ ...s.btnSecondary, padding: '3px 10px', fontSize: '11px' }}
                        onClick={() => onToggle(model.id, !model.enabled)}
                    >
                        {model.enabled ? (lang === 'zh' ? '禁用' : 'Disable') : (lang === 'zh' ? '启用' : 'Enable')}
                    </button>
                    <button
                        style={{ ...s.btnSecondary, padding: '3px 10px', fontSize: '11px' }}
                        onClick={() => onEdit(model, apiKey)}
                    >
                        {lang === 'zh' ? '编辑' : 'Edit'}
                    </button>
                    <button
                        style={{ ...s.btnSecondary, padding: '3px 10px', fontSize: '11px', color: 'var(--vscode-errorForeground)' }}
                        onClick={() => { if (window.confirm(`删除 ${model.label}？`)) { onRemove(model.id); } }}
                    >
                        {lang === 'zh' ? '删除' : 'Delete'}
                    </button>
                </div>
            </div>
            {/* Footer: URL + key status */}
            <div style={{ marginTop: '7px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span>{model.baseUrl || '(未设置 Base URL)'}</span>
                <span style={{ color: apiKey ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-errorForeground)' }}>
                    {apiKey ? 'API Key 已配置' : 'API Key 未配置'}
                </span>
            </div>
        </div>
    );
};

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
            return MODEL_DEFS[existing.model.modelId]?.group || GROUPS[0];
        }
        return GROUPS[0];
    });
    const [selectedModelId, setSelectedModelId] = useState(existing?.model.modelId || '');
    const [customModelId, setCustomModelId] = useState(existing?.model.modelId || '');
    const [customLabel, setCustomLabel] = useState(existing?.model.label || '');
    const [baseUrl, setBaseUrl] = useState(existing?.model.baseUrl || '');
    const [tasks, setTasks] = useState<string[]>(existing?.model.tasks || []);
    const [apiKey, setApiKey] = useState(existing?.apiKey || '');
    const [step, setStep] = useState(isEdit ? 2 : 1);

    const isCustomGroup = selectedGroup === '自定义接口';
    const modelsInGroup = Object.entries(MODEL_DEFS).filter(([, d]) => d.group === selectedGroup && d.group !== '自定义接口');
    const effectiveModelId = isCustomGroup ? '__custom__' : selectedModelId;
    const def = MODEL_DEFS[effectiveModelId];

    const handleGroupChange = (g: string) => {
        setSelectedGroup(g);
        const first = Object.entries(MODEL_DEFS).find(([, d]) => d.group === g && d.group !== '自定义接口');
        if (first) {
            setSelectedModelId(first[0]);
            setBaseUrl(first[1].baseUrl);
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
                                <select style={s.select} value={selectedModelId} onChange={e => handleModelChange(e.target.value)}>
                                    {modelsInGroup.map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
                                </select>
                                {def && <p style={s.hint}>{def.note}</p>}
                                {def?.relay && (
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

                        <div style={{ marginBottom: '16px' }}>
                            <label style={s.label}>
                                {lang === 'zh' ? '任务类型（多选）' : 'Task Types (multi-select)'}
                                <span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.65, marginLeft: '8px' }}>
                                    已根据模型特点预设，可修改
                                </span>
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
                            {!isEdit
                                ? <button style={s.btnSecondary} onClick={() => setStep(1)}>上一步</button>
                                : <div />
                            }
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
                                'Anthropic (Claude)': { text: '申请 Claude Key', url: 'https://console.anthropic.com' },
                                'Google (Gemini)': { text: '申请 Gemini Key', url: 'https://aistudio.google.com/apikey' },
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
                            <button style={s.btnSecondary} onClick={() => setStep(2)}>上一步</button>
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

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.data.command === 'loadModelsV2') {
                setModels(ev.data.models || []);
                setApiKeys(ev.data.apiKeys || {});
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                        {lang === 'zh' ? '模型管理' : 'Model Management'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                        {lang === 'zh'
                            ? `${enabled} 个模型已启用 · L-Hub 根据任务类型自动路由到对应模型`
                            : `${enabled} model(s) enabled · L-Hub auto-routes each task to the matching model`}
                    </p>
                </div>
                <button style={s.btnPrimary} onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                    {lang === 'zh' ? '+ 添加模型' : '+ Add Model'}
                </button>
            </div>

            {/* List */}
            {models.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '50px 20px',
                    color: 'var(--vscode-descriptionForeground)',
                    border: '1px dashed var(--vscode-panel-border)',
                    borderRadius: '6px',
                }}>
                    <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                        {lang === 'zh' ? '尚未配置任何模型' : 'No models configured'}
                    </div>
                    <div style={{ fontSize: '12px' }}>
                        {lang === 'zh' ? '点击「+ 添加模型」开始' : 'Click "+ Add Model" to get started'}
                    </div>
                </div>
            ) : (
                models.map(m => (
                    <ModelCard
                        key={m.id} model={m} apiKey={apiKeys[m.id] || ''}
                        lang={lang} onEdit={handleEdit} onRemove={handleRemove} onToggle={handleToggle}
                    />
                ))
            )}

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
                                        <td style={{ padding: '5px 10px', opacity: 0.7 }}>{row.group}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            ${row.pricing.input.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            ${row.pricing.output.toFixed(2)}
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
                                ? '价格来源：OpenRouter（2026-03），单位：美元/百万 tokens。直连官方 API 价格可能不同。'
                                : 'Source: OpenRouter (2026-03). USD per million tokens. Direct API pricing may vary.'}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer note */}
            <div style={{
                marginTop: '18px', padding: '10px 14px',
                background: 'var(--vscode-textBlockQuote-background)',
                borderLeft: '3px solid var(--vscode-activityBarBadge-background)',
                borderRadius: '0 4px 4px 0',
                fontSize: '11px', color: 'var(--vscode-descriptionForeground)', lineHeight: '1.6',
            }}>
                {lang === 'zh'
                    ? '路由规则：L-Hub 收到请求时，按任务类型找出所有已启用的匹配模型，选优先级最高（列表最上方）的那个。'
                    : 'Routing: L-Hub finds all enabled models matching the task type and picks the highest-priority one (top of list).'}
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
