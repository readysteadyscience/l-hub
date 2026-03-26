/**
 * ConfigPanel 数据层 — 模型注册表、任务类型、分组定义、价格表
 * 从 ConfigPanel.tsx 拆分出来的纯数据模块
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModelConfig {
    id: string;
    modelId: string;
    label: string;
    baseUrl: string;
    tasks: string[];
    enabled: boolean;
    priority: number;
}

// ─── Task Types ───────────────────────────────────────────────────────────────

export const TASK_TYPES = [
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

export interface ModelDef {
    label: string;
    group: string;
    baseUrl: string;
    defaultTasks: string[];
    note: string;
    relay?: boolean;
    pricing?: { input: number; output: number };
}

export const MODEL_DEFS: Record<string, ModelDef> = {
    'deepseek-chat': {
        label: 'DeepSeek-V3.2 (推荐)',
        group: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['translation', 'documentation'],
        note: '性价比之王（$0.028/M），翻译/文档/体力活首选',
        pricing: { input: 0.15, output: 0.60 },
    },
    'deepseek-reasoner': {
        label: 'DeepSeek-R1 (推理)',
        group: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['math_reasoning', 'architecture', 'code_review'],
        note: 'R1 深度推理，思维链分析、数学、规划',
        pricing: { input: 0.70, output: 2.50 },
    },
    'glm-5': {
        label: 'GLM-5 通用',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['code_review', 'long_context', 'agentic'],
        note: '复杂工程/调试首选，长文本连贯性前3',
        pricing: { input: 1.50, output: 6.00 },
    },
    'glm-5-coding': {
        label: 'GLM-5 编程版',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        defaultTasks: ['code_review', 'agentic', 'long_context'],
        note: 'Coding Plan 包月 · 复杂跨文件工程/调试 · 消耗 2x-3x 套餐配额',
        pricing: undefined,
    },
    'glm-5-turbo': {
        label: 'GLM-5-Turbo (Agent)',
        group: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['agentic', 'tool_calling', 'code_gen', 'long_context'],
        note: '最新（2026-03-16）OpenClaw Agent 专用 · 200K 上下文 · 128K 输出',
        pricing: { input: 1.20, output: 4.00 },
    },
    'qwen-max': {
        label: 'Qwen3-Max (推荐)',
        group: 'Qwen (通义)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation', 'tool_calling'],
        note: '多语言 + 结构化写作 + 工具调用 Tau2-bench #1',
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
    'MiniMax-M2.5': {
        label: 'M2.5 通用',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.io/v1',
        defaultTasks: ['creative', 'agentic', 'long_context'],
        note: '中文文学创作 #1 + 高速生成（100+ tok/s）',
        pricing: { input: 0.40, output: 1.20 },
    },
    'MiniMax-M2.5-highspeed': {
        label: 'M2.5-highspeed Coding Plan',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.io/v1',
        defaultTasks: ['creative', 'documentation'],
        note: 'M2.5 高速版，去GPT味/文笔打磨，高频调用',
        pricing: undefined,
    },
    'MiniMax-M2.7': {
        label: 'M2.7 旗舰 (推荐)',
        group: 'MiniMax',
        baseUrl: 'https://api.minimax.io/v1',
        defaultTasks: ['agentic', 'code_gen', 'architecture', 'tool_calling'],
        note: '最新（2026-03-18）自我进化架构 · 软件工程与专业任务大幅提升',
        pricing: { input: 0.60, output: 1.80 },
    },
    'moonshot-v1-8k': {
        label: 'Kimi (moonshot-v1-8k)',
        group: 'Moonshot (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['agentic', 'code_gen', 'tool_calling', 'long_context'],
        note: '最新 K2.5（2026-01），1T MoE，256K 上下文，Agentic 顶尖',
        pricing: { input: 1.20, output: 4.80 },
    },
    'gpt-5.4': {
        label: 'GPT-5.4 (推荐)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'vision', 'architecture', 'long_context'],
        note: '最新旗舰（2026-03-05），集成 Codex 编程能力，1M token 上下文，原生 computer-use',
        pricing: { input: 2.50, output: 15.00 },
    },
    'gpt-5.4-pro': {
        label: 'GPT-5.4 Pro (企业)',
        group: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'agentic', 'tool_calling'],
        note: '代码生成顶级 · Terminal-Bench #1 · 企业级推理',
        pricing: { input: 30.00, output: 180.00 },
    },
    'meta-llama/llama-3.3-70b-instruct': {
        label: 'Llama 3.3 70B',
        group: 'Meta (Llama) — 需中转',
        baseUrl: '',
        defaultTasks: ['code_gen', 'translation'],
        note: '业界顶级梯队模型，需通过 OpenRouter / 硅基流动等中转',
        relay: true,
    },
    '__openrouter__': {
        label: 'OpenRouter',
        group: 'API 聚合平台',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultTasks: ['code_gen', 'architecture', 'translation'],
        note: '全球最大聚合（500+ 模型）。Model ID 格式：openai/gpt-5.4 · anthropic/claude-sonnet-4-6',
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
    '__custom__': {
        label: '自定义模型',
        group: '自定义接口',
        baseUrl: '',
        defaultTasks: [],
        note: '任意兼容 OpenAI 接口的模型（中转、私有部署等）',
        relay: true,
    },
};

// ─── Groups & Helpers ─────────────────────────────────────────────────────────

export const GROUP_MODEL_EXAMPLES: Record<string, string> = {
    'DeepSeek': 'deepseek-chat',
    'GLM (智谱)': 'glm-5',
    'Qwen (通义)': 'qwen-max',
    'MiniMax': 'MiniMax-M2.5',
    'Moonshot (Kimi)': 'moonshot-v1-8k',
    'OpenAI': 'gpt-5.4',
};

export const GROUPS = [
    'DeepSeek', 'GLM (智谱)', 'Qwen (通义)', 'MiniMax', 'Moonshot (Kimi)', 'OpenAI',
    '第三方中转', '自定义接口',
];

export const RELAY_PRESETS = [
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', site: 'https://openrouter.ai', note: '国际标杆，模型最全（500+）' },
    { name: 'UniAPI 内地 HK', url: 'https://hk.uniapi.io/v1', site: 'https://uniapi.io', note: '大陆优化线路，国内首选' },
    { name: 'UniAPI 国际', url: 'https://api.uniapi.io/v1', site: 'https://uniapi.io', note: '国际线路，支持 GPT/Claude/Gemini/DeepSeek' },
    { name: 'CloseAI', url: 'https://api.closeai-asia.com/v1', site: 'https://closeai-asia.com', note: '亚洲企业级中转' },
    { name: '硅基流动 SiliconFlow', url: 'https://api.siliconflow.cn/v1', site: 'https://cloud.siliconflow.cn', note: '国内正规大平台' },
];

export const PRICE_TABLE = Object.entries(MODEL_DEFS)
    .filter(([, d]) => d.pricing)
    .sort((a, b) => (a[1].pricing!.input - b[1].pricing!.input))
    .map(([id, d]) => ({ id, label: d.label, group: d.group, pricing: d.pricing! }));

export const USD_TO_CNY = 7.3;
export const formatPrice = (usd: number, lang: string) => {
    if (lang === 'zh') {
        const cny = usd * USD_TO_CNY;
        return `¥${cny < 10 ? cny.toFixed(2) : cny.toFixed(1)}`;
    }
    return `$${usd.toFixed(2)}`;
};
