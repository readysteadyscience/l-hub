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
        defaultTasks: ['translation', 'documentation'],
        note_zh: '性价比之王（$0.028/M），翻译/文档/体力活首选',
        note_en: 'Best value ($0.028/M), ideal for translation/docs/routine tasks',
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
        defaultTasks: ['code_review', 'long_context', 'agentic'],
        note_zh: '复杂工程/调试首选，长文本连贯性前3',
        note_en: 'Complex engineering/debugging, top-3 long-text coherence',
        requiresApiKey: true,
    },
    'glm-5-coding': {
        label: 'GLM-5 (Coding Plan)',
        providerGroup: 'GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        defaultTasks: ['code_review', 'agentic', 'long_context'],
        note_zh: 'Coding Plan 包月 · 复杂跨文件工程/调试 · 消耗 2x-3x 套餐配额',
        note_en: 'Coding Plan · complex multi-file engineering · 2x-3x quota',
        requiresApiKey: true,
    },
    'glm-5-turbo': {
        label: 'GLM-5-Turbo (Agent)',
        providerGroup: 'GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['agentic', 'tool_calling', 'code_gen', 'long_context'],
        note_zh: '最新（2026-03-16）OpenClaw Agent 专用 · 200K 上下文 · 128K 输出',
        note_en: 'Latest (2026-03-16) OpenClaw Agent specialized · 200K ctx · 128K output',
        requiresApiKey: true,
    },

    // ── Qwen (通义) ───────────────────────────────────────────
    'qwen-max': {
        label: 'Qwen-Max (推荐)',
        providerGroup: 'Qwen (通义)',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation', 'tool_calling'],
        note_zh: '多语言 + 结构化写作 + 工具调用 Tau2-bench #1',
        note_en: 'Multilingual, structured writing, Tau2-bench #1 tool calls',
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
        defaultBaseUrl: 'https://api.minimax.io/v1',
        defaultTasks: ['creative', 'agentic', 'long_context'],
        note_zh: '中文文学创作 #1 + 高速生成（100+ tok/s）',
        note_en: 'Chinese creative writing #1, high-speed (100+ tok/s)',
        requiresApiKey: true,
    },
    'MiniMax-M2.5-highspeed': {
        label: 'MiniMax-M2.5 HighSpeed',
        providerGroup: 'MiniMax',
        defaultBaseUrl: 'https://api.minimax.io/v1',
        defaultTasks: ['creative', 'documentation'],
        note_zh: 'M2.5 高速版，去GPT味/文笔打磨，高频调用',
        note_en: 'M2.5 high-speed, writing polish, high-frequency calls',
        requiresApiKey: true,
    },
    'MiniMax-M2.7': {
        label: 'MiniMax-M2.7 旗舰 (推荐)',
        providerGroup: 'MiniMax',
        defaultBaseUrl: 'https://api.minimax.io/v1',
        defaultTasks: ['agentic', 'code_gen', 'architecture', 'tool_calling'],
        note_zh: '最新（2026-03-18）自我进化架构 · 软件工程与专业任务大幅提升',
        note_en: 'Latest (2026-03-18) Self-evolving architecture · Major SWE gains',
        requiresApiKey: true,
    },
    // ── Moonshot (Kimi) ──────────────────────────────────────────────
    'moonshot-v1-8k': {
        label: 'Kimi (moonshot-v1-8k)',
        providerGroup: 'Moonshot (Kimi)',
        defaultBaseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling', 'long_context'],
        note_zh: '最新 K2.5（2026-01），1T MoE，256K 上下文，Agentic 顶尖',
        note_en: 'Latest K2.5, 1T MoE, 256K ctx, top Agentic',
        requiresApiKey: true,
    },
    // ── OpenAI ───────────────────────────────────────────────
    'gpt-5.4': {
        label: 'GPT-5.4 (推荐)',
        providerGroup: 'OpenAI',
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'vision', 'architecture', 'long_context'],
        note_zh: '最新旗舰（2026-03-05），集成 Codex 编程能力，1M token 上下文，原生 computer-use',
        note_en: 'Latest flagship, integrated Codex power, 1M context, native computer-use',
        requiresApiKey: true,
    },
    'gpt-5.4-pro': {
        label: 'GPT-5.4 Pro (企业)',
        providerGroup: 'OpenAI',
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic', 'tool_calling'],
        note_zh: '代码生成顶级 · Terminal-Bench #1 · 企业级推理',
        note_en: 'Top code gen, Terminal-Bench #1, enterprise reasoning',
        requiresApiKey: true,
    },
    // Removed Anthropic (Claude) and Google (Gemini) per instruction
};

// Grouped list for UI dropdowns
export const PROVIDER_GROUPS = [
    'DeepSeek',
    'GLM (智谱)',
    'Qwen (通义)',
    'MiniMax',
    'Moonshot (Kimi)'
];

export function getModelsInGroup(group: string): Array<[string, ModelDefinition]> {
    return Object.entries(MODEL_REGISTRY).filter(([, def]) => def.providerGroup === group);
}

