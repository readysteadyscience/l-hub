// ─── Task Types ──────────────────────────────────────────────────────────────

export const TASK_TYPES = [
    { id: 'code_gen', label_zh: '代码生成', label_en: 'Code Generation' },
    { id: 'code_review', label_zh: '调试 / 重构', label_en: 'Debug & Refactor' },
    { id: 'architecture', label_zh: '架构设计', label_en: 'Architecture' },
    { id: 'documentation', label_zh: '文档 / 注释', label_en: 'Documentation' },
    { id: 'translation', label_zh: '翻译', label_en: 'Translation' },
    { id: 'ui_design', label_zh: 'UI / 前端', label_en: 'UI & Frontend' },
    { id: 'vision', label_zh: '图像理解', label_en: 'Vision' },
    { id: 'long_context', label_zh: '长文本分析', label_en: 'Long Context' },
    { id: 'math_reasoning', label_zh: '数学 / 推理', label_en: 'Math & Reasoning' },
    { id: 'tool_calling', label_zh: '工具调用', label_en: 'Tool Calling' },
    { id: 'creative', label_zh: '创意写作', label_en: 'Creative Writing' },
    { id: 'agentic', label_zh: 'Agentic', label_en: 'Agentic Tasks' },
] as const;

export type TaskId = typeof TASK_TYPES[number]['id'];

// ─── Model Registry ──────────────────────────────────────────────────────────

export interface ModelDefinition {
    label: string;
    providerGroup: string;
    defaultBaseUrl: string;
    defaultTasks: TaskId[];
    note_zh: string;
    note_en: string;
    requiresApiKey: boolean;
    isRelay?: boolean;
}

export const MODEL_REGISTRY: Record<string, ModelDefinition> = {
    // ── DeepSeek ──────────────────────────────────────────────
    'deepseek-chat': {
        label: 'DeepSeek-V3 (推荐)',
        providerGroup: 'DeepSeek',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'math_reasoning'],
        note_zh: '最新 V3.2（2025-12）综合能力强，性价比最高',
        note_en: 'Latest V3.2, best cost-efficiency, fast',
        requiresApiKey: true,
    },
    'deepseek-reasoner': {
        label: 'DeepSeek-R1 (推理)',
        providerGroup: 'DeepSeek',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['math_reasoning', 'architecture', 'code_review'],
        note_zh: 'R1 深度推理，思维链分析、数学、规划',
        note_en: 'R1 deep reasoning, chain-of-thought, math, planning',
        requiresApiKey: true,
    },
    // ── GLM (智谱) ────────────────────────────────────────────
    'glm-5': {
        label: 'GLM-5',
        providerGroup: 'GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['architecture', 'agentic', 'tool_calling', 'code_gen'],
        note_zh: '最新旗舰（2026-02），通用 API 端点，按量计费',
        note_en: 'Latest flagship (2026-02), general API endpoint, pay-per-use',
        requiresApiKey: true,
    },
    'glm-5-coding': {
        label: 'GLM-5 (Coding Plan)',
        providerGroup: 'GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        defaultTasks: ['architecture', 'agentic', 'code_gen', 'code_review'],
        note_zh: 'Coding Plan 包月 · 专属端点 · 消耗 2x-3x 套餐配额',
        note_en: 'Coding Plan monthly · dedicated endpoint · costs 2x-3x quota',
        requiresApiKey: true,
    },
    'glm-4.7': {
        label: 'GLM-4.7 (Coding Plan 推荐)',
        providerGroup: 'GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        defaultTasks: ['code_gen', 'code_review', 'agentic', 'tool_calling'],
        note_zh: 'Coding Plan 日常用，1x 配额消耗，省额度首选',
        note_en: 'Coding Plan daily use, 1x quota, most quota-efficient',
        requiresApiKey: true,
    },
    // ── Qwen (通义) ───────────────────────────────────────────
    'qwen-max': {
        label: 'Qwen-Max (推荐)',
        providerGroup: 'Qwen (通义)',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation', 'tool_calling', 'code_gen'],
        note_zh: '通义最新旗舰（Qwen3.5），中文理解与翻译最强',
        note_en: 'Latest (Qwen3.5), best Chinese understanding & translation',
        requiresApiKey: true,
    },
    'qwen-coder-plus': {
        label: 'Qwen-Coder-Plus',
        providerGroup: 'Qwen (通义)',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic'],
        note_zh: '代码专项旗舰，Agentic 编程与工具调用',
        note_en: 'Code specialist, Agentic coding & tool use',
        requiresApiKey: true,
    },
    // ── MiniMax ───────────────────────────────────────────────
    'MiniMax-M2.5': {
        label: 'MiniMax-M2.5 (推荐)',
        providerGroup: 'MiniMax',
        defaultBaseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling', 'long_context'],
        note_zh: '最新旗舰（2025-12），SWE-bench 80.2%，Agentic 顶尖',
        note_en: 'Latest (2025-12), SWE-bench 80.2%, top Agentic',
        requiresApiKey: true,
    },
    'MiniMax-M2.5-highspeed': {
        label: 'MiniMax-M2.5 HighSpeed',
        providerGroup: 'MiniMax',
        defaultBaseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['code_gen', 'documentation'],
        note_zh: 'M2.5 高速版，响应更快，适合高频调用',
        note_en: 'M2.5 high-speed, faster response, high-frequency calls',
        requiresApiKey: true,
    },
    // ── Kimi K2 ──────────────────────────────────────────────
    'kimi-k2-instruct': {
        label: 'Kimi K2.5 (推荐)',
        providerGroup: 'Kimi K2',
        defaultBaseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling', 'long_context'],
        note_zh: '最新 K2.5（2026-01），1T MoE，256K 上下文，Agentic 顶尖',
        note_en: 'Latest K2.5, 1T MoE, 256K ctx, top Agentic',
        requiresApiKey: true,
    },
    // ── OpenAI ───────────────────────────────────────────────
    'gpt-5.1': {
        label: 'GPT-5.1 (推荐)',
        providerGroup: 'OpenAI',
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'vision', 'architecture', 'long_context'],
        note_zh: '最新旗舰，超长上下文，复杂推理与多模态',
        note_en: 'Latest flagship, ultra long context, complex reasoning',
        requiresApiKey: true,
    },
    'gpt-5.3-codex': {
        label: 'GPT-5.3 Codex (编程)',
        providerGroup: 'OpenAI',
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic', 'tool_calling'],
        note_zh: 'Terminal-Bench #1，Agentic 编程与 DevOps 顶尖',
        note_en: 'Terminal-Bench #1, top Agentic coding & DevOps',
        requiresApiKey: true,
    },
    // ── Anthropic (Claude) ───────────────────────────────────
    'claude-opus-4-6': {
        label: 'Claude Opus 4.6 (推荐)',
        providerGroup: 'Anthropic (Claude)',
        defaultBaseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['architecture', 'agentic', 'code_review', 'long_context'],
        note_zh: '最新旗舰（2026-02），全球编程最强，企业级 Agentic',
        note_en: 'Latest flagship (2026-02), best coding globally, enterprise Agentic',
        requiresApiKey: true,
    },
    'claude-sonnet-4-6': {
        label: 'Claude Sonnet 4.6',
        providerGroup: 'Anthropic (Claude)',
        defaultBaseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'creative', 'architecture', 'documentation'],
        note_zh: '最新（2026-02），性能与成本最佳平衡，通用主力',
        note_en: 'Latest (2026-02), best performance/cost balance',
        requiresApiKey: true,
    },
    'claude-opus-4-5': {
        label: 'Claude Opus 4.5',
        providerGroup: 'Anthropic (Claude)',
        defaultBaseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_review', 'architecture', 'agentic'],
        note_zh: 'SWE-bench 72.5% 编程顶尖（2025-05）',
        note_en: 'SWE-bench 72.5%, top coding (2025-05)',
        requiresApiKey: true,
    },
    'claude-sonnet-4-5': {
        label: 'Claude Sonnet 4.5',
        providerGroup: 'Anthropic (Claude)',
        defaultBaseUrl: 'https://api.anthropic.com/v1',
        defaultTasks: ['code_gen', 'creative', 'documentation'],
        note_zh: '均衡旗舰（2025-05），代码与内容创作首选',
        note_en: 'Balanced flagship (2025-05), code & content creation',
        requiresApiKey: true,
    },
    // ── Google Gemini ────────────────────────────────────────
    'gemini-3.1-flash': {
        label: 'Gemini 3.1 Flash (推荐)',
        providerGroup: 'Google (Gemini)',
        defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['vision', 'code_gen', 'tool_calling', 'long_context'],
        note_zh: '最新 Flash（2026），速度快成本低，多模态全能',
        note_en: 'Latest Flash (2026), fast & cheap, multimodal',
        requiresApiKey: true,
    },
    'gemini-3.1-pro-preview': {
        label: 'Gemini 3.1 Pro Preview',
        providerGroup: 'Google (Gemini)',
        defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['math_reasoning', 'architecture', 'long_context', 'vision'],
        note_zh: '顶级推理，百万 token 上下文',
        note_en: 'Top reasoning, million token context',
        requiresApiKey: true,
    },
    'gemini-3-image': {
        label: 'Gemini Image Gen (生图)',
        providerGroup: 'Google (Gemini)',
        defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultTasks: ['vision', 'creative', 'ui_design'],
        note_zh: '专用图像生成与编辑（Imagen 3 驱动）',
        note_en: 'Image generation & editing (Imagen 3)',
        requiresApiKey: true,
    },
    // ── Mistral ──────────────────────────────────────────────
    'mistral-large-latest': {
        label: 'Mistral Large 3 (推荐)',
        providerGroup: 'Mistral',
        defaultBaseUrl: 'https://api.mistral.ai/v1',
        defaultTasks: ['translation', 'tool_calling', 'code_gen'],
        note_zh: '欧洲隐私合规，多语言优秀',
        note_en: 'EU privacy compliant, excellent multilingual',
        requiresApiKey: true,
    },
    // ── Meta Llama (中转) ────────────────────────────────────
    'meta-llama/llama-3.3-70b-instruct': {
        label: 'Llama 3.3 70B',
        providerGroup: 'Meta (Llama) — 需中转',
        defaultBaseUrl: '',
        defaultTasks: ['code_gen', 'translation'],
        note_zh: '业界最强开源模型，需通过 OpenRouter 等中转',
        note_en: 'Top open-source model, relay required (OpenRouter)',
        requiresApiKey: true,
        isRelay: true,
    },
};

// Grouped list for UI dropdowns
export const PROVIDER_GROUPS = [
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
];

export function getModelsInGroup(group: string): Array<[string, ModelDefinition]> {
    return Object.entries(MODEL_REGISTRY).filter(([, def]) => def.providerGroup === group);
}
