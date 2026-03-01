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
    note: string;          // short description shown in modal
    relay?: boolean;       // true = user must supply a relay/proxy URL
}

const MODEL_DEFS: Record<string, ModelDef> = {
    // ── DeepSeek ─────────────────────────────────────────────────────────────
    // https://platform.deepseek.com/api-docs/
    'deepseek-chat': {
        label: 'DeepSeek-V3 (推荐)',
        group: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'math_reasoning'],
        note: '最新 V3.2（2025-12）。综合能力强，性价比顶尖，推荐首选',
    },
    'deepseek-reasoner': {
        label: 'DeepSeek-R1 (推理)',
        group: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['math_reasoning', 'architecture', 'code_review'],
        note: '专为数学推理与复杂问题设计，思维链深度强',
    },
    // ── GLM (智谱) ────────────────────────────────────────────────────────────
    // https://open.bigmodel.cn/api/paas/v4
    'glm-4-plus': {
        label: 'GLM-4-Plus (推荐)',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['architecture', 'agentic', 'tool_calling', 'long_context'],
        note: '智谱旗舰，工具调用与 Agentic 实战能力领先',
    },
    'glm-4-flash': {
        label: 'GLM-4-Flash (免费)',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['code_gen', 'translation'],
        note: '免费额度大，速度极快，轻量日常任务首选',
    },
    'glm-4-airx': {
        label: 'GLM-4-AirX',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['code_gen', 'documentation'],
        note: '高速轻量版，适合高频调用场景',
    },
    // ── Qwen (通义) ───────────────────────────────────────────────────────────
    // https://help.aliyun.com/zh/model-studio/getting-started/models
    'qwen-max': {
        label: 'Qwen-Max (推荐)',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation', 'tool_calling', 'code_gen'],
        note: '通义旗舰，中文理解最强，翻译与工具调用首选',
    },
    'qwen-plus': {
        label: 'Qwen-Plus',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'code_gen'],
        note: '均衡性价比，中文代码两用',
    },
    'qwen-coder-plus': {
        label: 'Qwen-Coder-Plus',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic'],
        note: '代码专项旗舰，工具调用与 Agentic 编程',
    },
    'qwen-turbo': {
        label: 'Qwen-Turbo',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['code_gen', 'documentation'],
        note: '最快最便宜，高频轻量任务',
    },
    // ── MiniMax ───────────────────────────────────────────────────────────────
    // https://platform.minimaxi.com/document/Models
    'MiniMax-M2.5': {
        label: 'MiniMax-M2.5 (最新)',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling'],
        note: '最新旗舰（2025-12），SWE-bench 80.2%，Agentic 顶尖',
    },
    'MiniMax-M2.5-highspeed': {
        label: 'MiniMax-M2.5-highspeed',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['code_gen', 'long_context'],
        note: 'M2.5 高速版，响应更快',
    },
    'MiniMax-Text-01': {
        label: 'MiniMax-Text-01',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['long_context', 'creative', 'documentation'],
        note: '4M token 超长上下文，整个代码库一次输入（2025-01）',
    },
    // ── Moonshot (Kimi) ───────────────────────────────────────────────────────
    // https://platform.moonshot.cn/docs/api/
    'moonshot-v1-auto': {
        label: 'Kimi Auto (推荐)',
        group: 'Moonshot (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['long_context', 'documentation', 'code_review'],
        note: '自动选最优上下文（8K/32K/128K），按需计费，推荐',
    },
    'moonshot-v1-128k': {
        label: 'Kimi 128K',
        group: 'Moonshot (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['long_context', 'translation'],
        note: '固定 128K 上下文，超长文档分析',
    },
    'moonshot-v1-32k': {
        label: 'Kimi 32K',
        group: 'Moonshot (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['code_gen', 'documentation'],
        note: '32K 上下文，速度与长度均衡',
    },
    // ── OpenAI ────────────────────────────────────────────────────────────────
    // https://platform.openai.com/docs/models
    'gpt-4o': {
        label: 'GPT-4o (推荐)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['vision', 'tool_calling', 'code_gen', 'architecture'],
        note: '多模态旗舰，Function Calling 最成熟，官方直连',
    },
    'gpt-4o-mini': {
        label: 'GPT-4o Mini',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'tool_calling', 'documentation'],
        note: '低成本高性能，高频日常任务，官方直连',
    },
    'o3': {
        label: 'o3 (推理)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['math_reasoning', 'architecture', 'code_review'],
        note: '顶级推理能力，数学 / 科学 / 复杂逻辑',
    },
    'o4-mini': {
        label: 'o4-mini (推理)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['math_reasoning', 'code_gen'],
        note: '推理快且便宜，是 o3 的高性价比替代',
    },
    // ── Anthropic / Claude ────────────────────────────────────────────────────
    // https://docs.anthropic.com/en/docs/about-claude/models
    'claude-opus-4-5': {
        label: 'Claude Opus 4 (推荐)',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['architecture', 'long_context', 'agentic', 'code_review'],
        note: '编程最强，SWE-bench 72.5%，企业级 Agent，官方直连',
    },
    'claude-sonnet-4-5': {
        label: 'Claude Sonnet 4',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'creative', 'architecture', 'documentation'],
        note: '性能与成本最佳平衡，通用主力首选，官方直连',
    },
    'claude-haiku-4-5': {
        label: 'Claude Haiku 4.5',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'documentation', 'translation'],
        note: 'Claude 系列最快最省，高频日常任务',
    },
    'claude-3-7-sonnet-20250219': {
        label: 'Claude 3.7 Sonnet',
        group: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'math_reasoning'],
        note: '混合推理，支持扩展思考链（2025-02）',
    },
    // ── Google Gemini ─────────────────────────────────────────────────────────
    // https://ai.google.dev/gemini-api/docs/models
    // OpenAI-compatible endpoint: generativelanguage.googleapis.com/v1beta/openai
    'gemini-2.5-flash': {
        label: 'Gemini 2.5 Flash (推荐)',
        group: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['vision', 'code_gen', 'tool_calling', 'long_context'],
        note: '速度快成本低，多模态全能，推荐默认，官方直连',
    },
    'gemini-2.5-pro': {
        label: 'Gemini 2.5 Pro',
        group: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['math_reasoning', 'architecture', 'long_context', 'vision'],
        note: '推理顶级，100 万 token 上下文，官方直连',
    },
    'gemini-2.0-flash': {
        label: 'Gemini 2.0 Flash',
        group: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['vision', 'code_gen', 'creative'],
        note: '稳定版（2025-01），广泛兼容',
    },
    // ── Mistral ───────────────────────────────────────────────────────────────
    // https://docs.mistral.ai/getting-started/models/
    'mistral-large-latest': {
        label: 'Mistral Large (推荐)',
        group: 'Mistral',
        baseUrl: 'https://api.mistral.ai/v1',
        defaultTasks: ['translation', 'tool_calling', 'code_gen', 'architecture'],
        note: '欧洲隐私合规，多语言与代码俱佳，官方直连',
    },
    'mistral-small-latest': {
        label: 'Mistral Small',
        group: 'Mistral',
        baseUrl: 'https://api.mistral.ai/v1',
        defaultTasks: ['translation', 'documentation'],
        note: '轻量快速，低成本翻译与文档任务',
    },
    // ── Meta / Llama（需中转）────────────────────────────────────────────────
    'meta-llama/llama-3.3-70b-instruct': {
        label: 'Llama 3.3 70B',
        group: 'Meta (Llama) — 需中转',
        baseUrl: '',
        defaultTasks: ['code_gen', 'translation', 'documentation'],
        note: '开源最强代码模型，需中转（OpenRouter / 硅基流动）',
        relay: true,
    },
    // ── 自定义 ────────────────────────────────────────────────────────────────
    '__custom__': {
        label: '自定义模型',
        group: '自定义接口',
        baseUrl: '',
        defaultTasks: [],
        note: '兼容 OpenAI 接口的任意模型（中转、私有部署等）',
        relay: true,
    },
};

const GROUPS = [
    'DeepSeek',
    'GLM (智谱)',
    'Qwen (通义)',
    'MiniMax',
    'Moonshot (Kimi)',
    'OpenAI',
    'Anthropic (Claude)',
    'Google (Gemini)',
    'Mistral',
    'Meta (Llama) — 需中转',
    '自定义接口',
];

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
                    {/* Name + provider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{model.label}</span>
                        <span style={{ fontSize: '11px', opacity: 0.65 }}>{def?.group || model.modelId}</span>
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
