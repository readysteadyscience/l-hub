import React from 'react';
import { vscode } from '../vscode-api';
import { colors, radius, s } from '../theme';
import { Lang } from './Dashboard';


interface ModelConfig {
    id: string;
    modelId: string;
    label: string;
    baseUrl: string;
    tasks: string[];
    enabled: boolean;
    priority: number;
}

interface CreativeWritingConfig {
    outlineModels: string[];
    draftModels: string[];
    polishModel: string;
    evalModel: string;
}

const RoutingGuidePanel: React.FC<{ lang: Lang }> = ({ lang }) => {

    const [models, setModels] = React.useState<ModelConfig[]>([]);
    const [creativeConfig, setCreativeConfig] = React.useState<CreativeWritingConfig>({ outlineModels: [], draftModels: [], polishModel: '', evalModel: '' });

    React.useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.data.command === 'loadModelsV2') {
                setModels(ev.data.models || []);
            }
            if (ev.data.command === 'loadCreativeConfig') {
                setCreativeConfig(ev.data.data);
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'getModelsV2' });
        vscode.postMessage({ command: 'getCreativeConfig' });
        return () => window.removeEventListener('message', handler);
    }, []);

    const T = {
        en: {
            title: 'Default Routing Recommendations',
            desc: 'L-Hub routes different task types to specific models by default based on benchmarking and cost-effectiveness. You can freely change these in the Models tab.',
            colTask: 'Task / Feature',
            colModel: 'Recommended Model',
            colReason: 'Reason for Recommendation',
            data: [
                { task: 'Code Generation', model: 'GPT-5.4', reason: 'Integrates Codex capability; SWE-bench top-tier; 1M context; Codex CLI directly modifies local workspace.' },
                { task: 'Agentic Coding', model: 'MiniMax-M2.7', reason: 'SWE-Pro 56.22%; Agentic Index 61.5%; self-evolving architecture.' },
                { task: 'Multi-step / Chains', model: 'GLM-5-Turbo', reason: 'SWE-bench 77.8%; Terminal Bench 56.2; OpenClaw Agent specialized; 200K ctx / 128K output.' },
                { task: 'Economical Code', model: 'DeepSeek-V3', reason: 'Unbeatable cost-effectiveness ($0.028/M), lightning fast first-byte.' },
                { task: 'Translation / Docs', model: 'Qwen-Max (3.5)', reason: 'Qwen 3.5 series; superior Chinese localization; Tau2-bench #1 for tool calls.' },
                { task: 'UI / Frontend', model: 'Gemini 3.1 Pro', reason: 'ARC-AGI-2 Global #1 (77.1%); Chatbot Arena Coding 1531 Elo.' },
                { task: 'Math / Logic', model: 'Gemini 3.1 Pro', reason: 'GPQA 94.3%; Competitive Programming Elo 2887.' },
                { task: 'Long Context Summaries', model: 'Gemini 3.1 Pro', reason: '1M+ token context window; LMSYS Hard Prompts Context Giant.' },
                { task: 'Terminal / DevOps', model: 'GPT-5.4', reason: 'Chatbot Arena Coding 1538 Elo; strongest agentic terminal execution.' },
                { task: 'Creative / Mass Gen', model: 'MiniMax-M2.5 HighSpeed', reason: '100+ tokens/sec; Chinese creative writing #1.' },
                { task: 'Local File Operations', model: 'Codex CLI (`ai_codex_task`)', reason: 'OAuth Login (No Key Needed); Autonomous workspace manipulation.' },
                { task: 'Local Agentic', model: 'Gemini CLI (`ai_gemini_task`)', reason: 'Google OAuth (No Key Needed); Built-in file and browser agents.' }
            ]
        },
        zh: {
            title: '默认路由推荐表',
            desc: '为了最大化性能并节约使用成本，L-Hub 默认采用以下模型推荐。这只是初始指导字典，您可以在「模型管理」中自由为任何模型分配任务。',
            colTask: '使用场景 / 任务属性',
            colModel: '推荐绑定模型',
            colReason: '核心竞争力入选理由',
            data: [
                { task: '代码生成', model: 'GPT-5.4', reason: '集成 Codex 编程能力，SWE-bench 顶级梯队，1M 上下文，Codex CLI 直接读写本地代码' },
                { task: 'Agentic 复杂编码', model: 'MiniMax-M2.7', reason: 'SWE-Pro 56.22% ≈ Claude Sonnet 4.6；Agentic Index 61.5%；自我进化架构' },
                { task: '多步调试 / 工具链', model: 'GLM-5-Turbo', reason: 'SWE-bench 77.8%；Terminal Bench 56.2；OpenClaw Agent 专用 · 200K ctx / 128K output' },
                { task: '代码经济型', model: 'DeepSeek-V3', reason: '无敌的性价比（$0.028/M）与极快的首字输出' },
                { task: '翻译 / 中文环境与文档', model: 'Qwen-Max (3.5)', reason: 'Qwen 3.5 系列；中文母语级；工具调用 Tau2-bench 称霸' },
                { task: 'UI / 前端视觉设计', model: 'Gemini 3.1 Pro', reason: 'ARC-AGI-2 全球 #1（77.1%）；Chatbot Arena Coding 1531 Elo；美学品位独步天下' },
                { task: '极强推理 / 算法 / 数学', model: 'Gemini 3.1 Pro', reason: 'GPQA 94.3%；竞技编程水平超神（Elo 2887）' },
                { task: '超长文本 / 源码库总结', model: 'Gemini 3.1 Pro', reason: '稳定扛起百万 Token 级别的上下文洪流；LMSYS Hard Prompts "Context Giant"' },
                { task: '终端命令 / DevOps', model: 'GPT-5.4', reason: 'Chatbot Arena Coding 1538 Elo；终端环境 Agentic 执行最强' },
                { task: '极速生成 / 闲聊 / 脑暴', model: 'MiniMax-M2.5 HighSpeed', reason: '100 tok/s，中文创意写作 #1，流式体验拉满' },
                { task: '独立安全本地文件操作', model: 'Codex CLI (`ai_codex_task`)', reason: '直接走 OAuth 免 Key；以隔离全功能独立 Agent 形态干脏活' },
                { task: '系统级深度本地爬虫', model: 'Gemini CLI (`ai_gemini_task`)', reason: '走 Google OAuth 订阅额度；原厂自带视效浏览器控制系统' }
            ]
        }
    }[lang];

    return (
        <div className="animate-in" style={{ maxWidth: '860px', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '12px' }}>
                <div style={{
                    fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                }}>
                    {lang === 'zh' ? 'SYS_ROUTING_MATRIX' : 'SYS_ROUTING_MATRIX'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                    &gt; {T.desc}
                </div>
            </div>

            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px', fontFamily: 'monospace' }}>
                    <thead>
                        <tr style={{ background: 'var(--vscode-editor-inactiveSelectionBackground)', borderBottom: '1px dashed var(--vscode-panel-border)' }}>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--vscode-editor-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{T.colTask}</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--vscode-editor-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{T.colModel}</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--vscode-descriptionForeground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{T.colReason}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {T.data.map((row, i) => (
                            <tr key={i} style={{
                                borderBottom: i === T.data.length - 1 ? 'none' : '1px solid var(--vscode-panel-border)',
                                transition: 'background 0.1s'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '10px 14px', color: 'var(--vscode-editor-foreground)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {row.task}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--vscode-editor-foreground)', whiteSpace: 'nowrap' }}>
                                    [{row.model}]
                                </td>
                                <td style={{ padding: '10px 14px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.4 }}>
                                    {row.reason}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Creative Writing Chain Settings */}
            <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '12px' }}>
                    <div style={{
                        fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                        color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                    }}>
                        CREATIVE_CHAIN_SCHEDULER
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                        &gt; {lang === 'zh' ? '多模型长文生成管线组态' : 'Multi-model pipeline config for long-form generation'}
                    </div>
                </div>
                
                <div style={{
                    padding: '16px', borderRadius: radius.sm,
                    background: 'var(--vscode-editor-background)',
                    border: '1px solid var(--vscode-panel-border)',
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            [ 01_OUTLINE_BIDDING ]
                        </label>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; Select 2+ nodes for parallel outline generation
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {models.filter(m => m.enabled).map(m => (
                                <span
                                    key={m.id}
                                    onClick={() => {
                                        const newModels = creativeConfig.outlineModels.includes(m.modelId)
                                            ? creativeConfig.outlineModels.filter(id => id !== m.modelId)
                                            : [...creativeConfig.outlineModels, m.modelId];
                                        const next = { ...creativeConfig, outlineModels: newModels };
                                        setCreativeConfig(next);
                                        vscode.postMessage({ command: 'saveCreativeConfig', config: next });
                                    }}
                                    style={{
                                        padding: '4px 8px', borderRadius: radius.sm, cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', fontWeight: 600,
                                        background: creativeConfig.outlineModels.includes(m.modelId) ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        color: creativeConfig.outlineModels.includes(m.modelId) ? '#10B981' : 'var(--vscode-descriptionForeground)',
                                        border: `1px solid ${creativeConfig.outlineModels.includes(m.modelId) ? 'rgba(16, 185, 129, 0.3)' : 'var(--vscode-panel-border)'}`,
                                        userSelect: 'none',
                                    }}
                                >
                                    {creativeConfig.outlineModels.includes(m.modelId) ? `[x] ${m.modelId}` : `[ ] ${m.modelId}`}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            [ 02_PARALLEL_DRAFTING ]
                        </label>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; Select target execution nodes for generating draft permutations
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {models.filter(m => m.enabled).map(m => (
                                <span
                                    key={m.id}
                                    onClick={() => {
                                        const newModels = creativeConfig.draftModels.includes(m.modelId)
                                            ? creativeConfig.draftModels.filter(id => id !== m.modelId)
                                            : [...creativeConfig.draftModels, m.modelId];
                                        const next = { ...creativeConfig, draftModels: newModels };
                                        setCreativeConfig(next);
                                        vscode.postMessage({ command: 'saveCreativeConfig', config: next });
                                    }}
                                    style={{
                                        padding: '4px 8px', borderRadius: radius.sm, cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', fontWeight: 600,
                                        background: creativeConfig.draftModels.includes(m.modelId) ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        color: creativeConfig.draftModels.includes(m.modelId) ? '#10B981' : 'var(--vscode-descriptionForeground)',
                                        border: `1px solid ${creativeConfig.draftModels.includes(m.modelId) ? 'rgba(16, 185, 129, 0.3)' : 'var(--vscode-panel-border)'}`,
                                        userSelect: 'none',
                                    }}
                                >
                                    {creativeConfig.draftModels.includes(m.modelId) ? `[x] ${m.modelId}` : `[ ] ${m.modelId}`}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            [ 03_POLISH_REVISION ]
                        </label>
                        <select 
                            style={s.select}
                            value={creativeConfig.polishModel}
                            onChange={(e) => {
                                const next = { ...creativeConfig, polishModel: e.target.value };
                                setCreativeConfig(next);
                                vscode.postMessage({ command: 'saveCreativeConfig', config: next });
                            }}
                        >
                            <option value="">(跳过此环节)</option>
                            {models.filter(m => m.enabled).map(m => (
                                <option key={m.id} value={m.modelId}>{m.label}</option>
                            ))}
                        </select>
                        <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>&gt; Recommended: MiniMax-M2.5 or other literary models.</p>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            [ 04_COHERENCE_EVAL ]
                        </label>
                        <select 
                            style={s.select}
                            value={creativeConfig.evalModel}
                            onChange={(e) => {
                                const next = { ...creativeConfig, evalModel: e.target.value };
                                setCreativeConfig(next);
                                vscode.postMessage({ command: 'saveCreativeConfig', config: next });
                            }}
                        >
                            <option value="">(跳过此环节)</option>
                            {models.filter(m => m.enabled).map(m => (
                                <option key={m.id} value={m.modelId}>{m.label}</option>
                            ))}
                        </select>
                        <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>&gt; Recommended: GLM-5 or Claude Opus for strict logic coherence.</p>
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <div style={{
                marginTop: '16px', paddingTop: '12px',
                borderTop: '1px dashed var(--vscode-panel-border)',
                fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', lineHeight: '1.6',
            }}>
                &gt; {lang === 'zh'
                    ? 'ROUTING_POLICY: 按任务类型匹配已启用的模型，选优先级最高的（列表靠上）。可随时添加新节点自定义调度栈。'
                    : 'ROUTING_POLICY: matches the task type to enabled models and picks highest-priority node.'}
            </div>
        </div>
    );
};

export default RoutingGuidePanel;
