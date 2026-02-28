// ─── Task Types ──────────────────────────────────────────────────────────────

export const TASK_TYPES = [
    { id: 'code_gen', label_zh: '💻 代码生成', label_en: '💻 Code Generation' },
    { id: 'code_review', label_zh: '🔍 代码审查/调试', label_en: '🔍 Code Review & Debug' },
    { id: 'architecture', label_zh: '🏗️ 架构设计', label_en: '🏗️ Architecture Design' },
    { id: 'documentation', label_zh: '📝 文档/注释', label_en: '📝 Documentation' },
    { id: 'translation', label_zh: '🌐 翻译/多语言', label_en: '🌐 Translation & Multilingual' },
    { id: 'ui_design', label_zh: '🎨 UI/前端设计', label_en: '🎨 UI & Frontend' },
    { id: 'vision', label_zh: '👁️ 图像理解', label_en: '👁️ Vision / Image' },
    { id: 'long_context', label_zh: '📚 长文本分析', label_en: '📚 Long Document Analysis' },
    { id: 'math_reasoning', label_zh: '🧮 数学/推理', label_en: '🧮 Math & Reasoning' },
    { id: 'tool_calling', label_zh: '🔧 工具调用', label_en: '🔧 Tool Calling' },
    { id: 'creative', label_zh: '✍️ 创意写作', label_en: '✍️ Creative Writing' },
    { id: 'agentic', label_zh: '🤖 Agentic 任务', label_en: '🤖 Agentic Tasks' },
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
    isRelay?: boolean; // requires custom base URL from user
}

export const MODEL_REGISTRY: Record<string, ModelDefinition> = {
    // ── DeepSeek ──────────────────────────────────────────────
    'deepseek-chat': {
        label: 'DeepSeek-V3',
        providerGroup: '🇨🇳 DeepSeek',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['code_gen', 'code_review', 'math_reasoning'],
        note_zh: 'SWE-bench Top 5，性价比最高，速度快',
        note_en: 'SWE-bench Top 5, best cost-efficiency, fast',
        requiresApiKey: true,
    },
    'deepseek-reasoner': {
        label: 'DeepSeek-R1 (Reasoner)',
        providerGroup: '🇨🇳 DeepSeek',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['math_reasoning', 'architecture', 'code_gen'],
        note_zh: '推理专属模型，数学/科学问题表现最强',
        note_en: 'Reasoning specialist, top for math & science',
        requiresApiKey: true,
    },
    'deepseek-coder': {
        label: 'DeepSeek-Coder',
        providerGroup: '🇨🇳 DeepSeek',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        defaultTasks: ['code_gen', 'code_review'],
        note_zh: '代码类任务专属，自动补全能力顶尖',
        note_en: 'Code-specific model, top autocomplete',
        requiresApiKey: true,
    },
    // ── GLM (Zhipu) ─────────────────────────────────────────
    'glm-4': {
        label: 'GLM-4',
        providerGroup: '🇨🇳 GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['architecture', 'agentic', 'tool_calling', 'long_context'],
        note_zh: '工具调用成功率 90.6%，128K 上下文，Agentic 最强',
        note_en: '90.6% tool call success, 128K ctx, best for Agentic',
        requiresApiKey: true,
    },
    'glm-4-flash': {
        label: 'GLM-4-Flash (Fast & Free)',
        providerGroup: '🇨🇳 GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['code_gen', 'tool_calling'],
        note_zh: '速度极快，免费额度大，适合高频调用',
        note_en: 'Very fast, generous free tier, high-frequency calls',
        requiresApiKey: true,
    },
    'glm-z1': {
        label: 'GLM-Z1 (Reasoning)',
        providerGroup: '🇨🇳 GLM (智谱)',
        defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultTasks: ['math_reasoning', 'architecture', 'code_review'],
        note_zh: '推理增强版，适合复杂工程分析',
        note_en: 'Reasoning-enhanced, complex engineering analysis',
        requiresApiKey: true,
    },
    // ── Qwen (Alibaba) ──────────────────────────────────────
    'qwen-max': {
        label: 'Qwen-Max',
        providerGroup: '🇨🇳 Qwen (通义)',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation', 'tool_calling'],
        note_zh: 'LMArena 文本榜全球第 3，中文最强，翻译领先',
        note_en: 'Global #3 LMArena text, best Chinese, top translation',
        requiresApiKey: true,
    },
    'qwen-plus': {
        label: 'Qwen-Plus',
        providerGroup: '🇨🇳 Qwen (通义)',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'code_gen', 'documentation'],
        note_zh: '性价比平衡，中文理解与代码能力均衡',
        note_en: 'Balanced cost-performance, Chinese & code',
        requiresApiKey: true,
    },
    'qwen-turbo': {
        label: 'Qwen-Turbo (Fast)',
        providerGroup: '🇨🇳 Qwen (通义)',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultTasks: ['translation', 'documentation'],
        note_zh: '速度最快，适合批量文档处理',
        note_en: 'Fastest, best for batch document processing',
        requiresApiKey: true,
    },
    // ── MiniMax ─────────────────────────────────────────────
    'abab6.5-chat': {
        label: 'MiniMax abab6.5',
        providerGroup: '🇨🇳 MiniMax',
        defaultBaseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['ui_design', 'creative', 'long_context'],
        note_zh: '100 tokens/s，大量内容生成速度最快',
        note_en: '100 tokens/s, fastest for large content generation',
        requiresApiKey: true,
    },
    'MiniMax-Text-01': {
        label: 'MiniMax-M1 (Text-01)',
        providerGroup: '🇨🇳 MiniMax',
        defaultBaseUrl: 'https://api.minimax.chat/v1',
        defaultTasks: ['long_context', 'code_gen', 'math_reasoning'],
        note_zh: '1M token 上下文，SWE-bench 65%，长文本推理最强',
        note_en: '1M token ctx, SWE-bench 65%, best long-context reasoning',
        requiresApiKey: true,
    },
    // ── Moonshot (Kimi) ─────────────────────────────────────
    'moonshot-v1-128k': {
        label: 'Kimi 128K (Moonshot)',
        providerGroup: '🇨🇳 Moonshot (月之暗面)',
        defaultBaseUrl: 'https://api.moonshot.cn/v1',
        defaultTasks: ['long_context', 'translation', 'documentation'],
        note_zh: '128K 超长上下文，中文文档处理优秀',
        note_en: '128K long context, excellent Chinese document processing',
        requiresApiKey: true,
    },
    // ── Yi ──────────────────────────────────────────────────
    'yi-large': {
        label: 'Yi-Large (零一万物)',
        providerGroup: '🇨🇳 01.AI (Yi)',
        defaultBaseUrl: 'https://api.lingyiwanwu.com/v1',
        defaultTasks: ['translation', 'code_gen'],
        note_zh: '多语言理解强，高性价比',
        note_en: 'Strong multilingual understanding, high cost-efficiency',
        requiresApiKey: true,
    },
    // ── International (via relay) ───────────────────────────
    'gpt-4o': {
        label: 'GPT-4o',
        providerGroup: '🌐 OpenAI (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['vision', 'tool_calling', 'code_gen', 'architecture'],
        note_zh: '多模态标杆，Function Calling 标准制定者',
        note_en: 'Multimodal benchmark, defines Function Calling standard',
        requiresApiKey: true,
        isRelay: true,
    },
    'gpt-4o-mini': {
        label: 'GPT-4o-mini',
        providerGroup: '🌐 OpenAI (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['code_gen', 'tool_calling'],
        note_zh: '低成本高性能，替代品质极高',
        note_en: 'Low cost high performance alternative',
        requiresApiKey: true,
        isRelay: true,
    },
    'claude-3-5-sonnet-20241022': {
        label: 'Claude Sonnet',
        providerGroup: '🌐 Anthropic (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['architecture', 'long_context', 'creative', 'code_review'],
        note_zh: '复杂推理深度最强，长文档分析专家',
        note_en: 'Deepest complex reasoning, long document expert',
        requiresApiKey: true,
        isRelay: true,
    },
    'claude-3-opus-20240229': {
        label: 'Claude Opus',
        providerGroup: '🌐 Anthropic (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['architecture', 'math_reasoning', 'long_context', 'creative'],
        note_zh: '旗舰推理能力，适合最复杂的分析任务',
        note_en: 'Flagship reasoning, most complex analysis tasks',
        requiresApiKey: true,
        isRelay: true,
    },
    'gemini-1.5-pro': {
        label: 'Gemini 1.5 Pro',
        providerGroup: '🌐 Google (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['vision', 'long_context', 'code_gen'],
        note_zh: '1M+ token 上下文，多模态，Google Research 支持',
        note_en: '1M+ token context, multimodal, Google Research',
        requiresApiKey: true,
        isRelay: true,
    },
    'gemini-2.0-flash': {
        label: 'Gemini 2.0 Flash',
        providerGroup: '🌐 Google (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['vision', 'code_gen', 'tool_calling'],
        note_zh: '速度极快，多模态，性价比高',
        note_en: 'Ultra fast, multimodal, great cost-efficiency',
        requiresApiKey: true,
        isRelay: true,
    },
    'meta-llama/llama-3.1-70b-instruct': {
        label: 'Llama 3.1 70B',
        providerGroup: '🌐 Meta (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['code_gen', 'translation'],
        note_zh: '开源最强代表，指令跟随出色',
        note_en: 'Top open-source model, excellent instruction following',
        requiresApiKey: true,
        isRelay: true,
    },
    'mistral-large-latest': {
        label: 'Mistral Large',
        providerGroup: '🌐 Mistral (relay)',
        defaultBaseUrl: '',
        defaultTasks: ['translation', 'tool_calling', 'code_gen'],
        note_zh: '欧洲隐私合规，多语言，工具调用强',
        note_en: 'EU privacy compliant, multilingual, strong function calling',
        requiresApiKey: true,
        isRelay: true,
    },
};

// Grouped list for UI dropdowns
export const PROVIDER_GROUPS = [
    '🇨🇳 DeepSeek',
    '🇨🇳 GLM (智谱)',
    '🇨🇳 Qwen (通义)',
    '🇨🇳 MiniMax',
    '🇨🇳 Moonshot (月之暗面)',
    '🇨🇳 01.AI (Yi)',
    '🌐 OpenAI (relay)',
    '🌐 Anthropic (relay)',
    '🌐 Google (relay)',
    '🌐 Meta (relay)',
    '🌐 Mistral (relay)',
    '🔌 Custom / Third-party',
];

export function getModelsInGroup(group: string): Array<[string, ModelDefinition]> {
    return Object.entries(MODEL_REGISTRY).filter(([, def]) => def.providerGroup === group);
}
