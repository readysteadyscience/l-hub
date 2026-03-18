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
                { task: 'Code Generation', model: 'GPT-5.4', reason: 'Integrates Codex capability; 1M context; Codex CLI directly modifies local workspace.' },
                { task: 'Agentic Coding', model: 'MiniMax-M2.5 Coding', reason: 'SWE-bench 80.2% ≈ Claude Opus 4.6; BFCL Tool Calling 76.8% surpasses Opus.' },
                { task: 'Multi-step / Chains', model: 'GLM-5 Coding Plan', reason: 'SWE-bench 77.8% (top-tier); Outstanding long context planning.' },
                { task: 'Economical Code', model: 'DeepSeek-V3', reason: 'Unbeatable cost-effectiveness, lightning fast.' },
                { task: 'Translation / Docs', model: 'Qwen-Max', reason: 'Superior Chinese localization; Tau2-bench #1 for tool calls.' },
                { task: 'UI / Frontend', model: 'Gemini 3.1 Pro', reason: 'ARC-AGI-2 Global #1 (77.1%); Unmatched frontend design.' },
                { task: 'Math / Logic', model: 'Gemini 3.1 Pro', reason: 'GPQA 94.3%; Competitive Programming Elo 2887.' },
                { task: 'Long Context Summaries', model: 'Gemini 3.1 Pro', reason: '1M+ token context window.' },
                { task: 'Terminal / DevOps', model: 'GPT-5.4', reason: 'Integrates Codex coding capabilities; strongest agentic execution.' },
                { task: 'Creative / Mass Gen', model: 'MiniMax-M2.5 HighSpeed', reason: '100+ tokens/sec, high-speed output.' },
                { task: 'Local File Operations', model: 'Codex CLI (`ai_codex_task`)', reason: 'OAuth Login (No Key Needed); Autonomous workspace manipulation.' },
                { task: 'Local Agentic', model: 'Gemini CLI (`ai_gemini_task`)', reason: 'Google OAuth (No Key Needed); Built-in file & browser agents.' }
            ]
        },
        zh: {
            title: '默认路由推荐表',
            desc: '为了最大化性能并节约使用成本，L-Hub 默认采用以下模型推荐。这只是初始指导字典，您可以在「模型管理」中自由为任何模型分配任务。',
            colTask: '使用场景 / 任务属性',
            colModel: '推荐绑定模型',
            colReason: '核心竞争力入选理由',
            data: [
                { task: '代码生成', model: 'GPT-5.4', reason: '集成 Codex 编程能力，1M 上下文，Codex CLI 能够直接读写操作本地代码' },
                { task: 'Agentic 复杂编码', model: 'MiniMax-M2.5 Coding', reason: 'SWE-bench 80.2% ≈ Claude Opus 4.6；BFCL 工具调用 76.8% 全球第二' },
                { task: '多步调试 / 工具链', model: 'GLM-5 Coding Plan', reason: 'SWE-bench 77.8%，顶级梯队；长程任务规划能力极强' },
                { task: '代码经济型', model: 'DeepSeek-V3', reason: '无敌的性价比与极快的首字输出' },
                { task: '翻译 / 中文环境与文档', model: 'Qwen-Max', reason: '中文母语级；工具调用 Tau2-bench 称霸' },
                { task: 'UI / 前端视觉设计', model: 'Gemini 3.1 Pro', reason: 'ARC-AGI-2 全球 #1（77.1%）；美学品位独步天下' },
                { task: '极强推理 / 算法 / 数学', model: 'Gemini 3.1 Pro', reason: 'GPQA 94.3%；竞技编程水平超神（Elo 2887）' },
                { task: '超长文本 / 源码库总结', model: 'Gemini 3.1 Pro', reason: '稳定扛起百万 Token 级别的上下文洪流' },
                { task: '终端命令 / DevOps', model: 'GPT-5.4', reason: '集成 Codex 编程能力，Agentic 执行与工程任务顶尖' },
                { task: '极速生成 / 闲聊 / 脑暴', model: 'MiniMax-M2.5 HighSpeed', reason: '100 tok/s，流式体验拉满' },
                { task: '独立安全本地文件操作', model: 'Codex CLI (`ai_codex_task`)', reason: '直接走 OAuth 免 Key 嫖；以隔离全功能独立 Agent 形态干脏活' },
                { task: '系统级深度本地爬虫', model: 'Gemini CLI (`ai_gemini_task`)', reason: '走 Google OAuth 订阅额度；原厂自带视效浏览器控制系统' }
            ]
        }
    }[lang];

    return (
        <div className="animate-in" style={{ maxWidth: '860px', paddingBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                    {T.title}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5 }}>
                    {T.desc}
                </div>
            </div>

            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: radius.md,
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--vscode-editor-foreground)' }}>{T.colTask}</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--vscode-editor-foreground)' }}>{T.colModel}</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--vscode-descriptionForeground)' }}>{T.colReason}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {T.data.map((row, i) => (
                            <tr key={i} style={{
                                borderBottom: i === T.data.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                                transition: 'background 0.1s'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '12px 16px', color: 'var(--vscode-editor-foreground)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                    {row.task}
                                </td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap' }}>
                                    {row.model}
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.4 }}>
                                    {row.reason}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Creative Writing Chain Settings */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--vscode-panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                            {lang === 'zh' ? '🖋️ 创意写作链 (Creative Chain)' : '🖋️ Creative Writing Chain'}
                        </h2>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                            {lang === 'zh'
                                ? '配置长文、小说写作时的多模型串流规则。主模型仅负责综合调度。'
                                : 'Configure multi-model pipelines for long-form writing.'}
                        </p>
                    </div>
                </div>
                
                <div style={{ ...s.card, padding: '16px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ ...s.label, fontSize: '13px', fontWeight: 600, color: 'var(--vscode-editor-foreground)' }}>
                            1. 大纲竞标 (Outline Bidding)
                        </label>
                        <p style={{ margin: '2px 0 8px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                            至少2个模型并行出大纲，主模型择优。
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
                                        padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                                        background: creativeConfig.outlineModels.includes(m.modelId) ? 'var(--vscode-button-background)' : 'var(--vscode-input-background)',
                                        color: creativeConfig.outlineModels.includes(m.modelId) ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
                                        border: '1px solid var(--vscode-input-border)',
                                        userSelect: 'none',
                                    }}
                                >
                                    {m.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ ...s.label, fontSize: '13px', fontWeight: 600, color: 'var(--vscode-editor-foreground)' }}>
                            2. 初稿竞写 (Drafting)
                        </label>
                        <p style={{ margin: '2px 0 8px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                            多模型并行写初稿，产生丰富素材。
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
                                        padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                                        background: creativeConfig.draftModels.includes(m.modelId) ? 'var(--vscode-button-background)' : 'var(--vscode-input-background)',
                                        color: creativeConfig.draftModels.includes(m.modelId) ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
                                        border: '1px solid var(--vscode-input-border)',
                                        userSelect: 'none',
                                    }}
                                >
                                    {m.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ ...s.label, fontSize: '13px', fontWeight: 600, color: 'var(--vscode-editor-foreground)' }}>
                            3. 文笔打磨 / 去 GPT 味 (Polishing)
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
                        <p style={s.hint}>推荐使用 MiniMax-M2.5 等中文文学表现优异的模型。</p>
                    </div>

                    <div>
                        <label style={{ ...s.label, fontSize: '13px', fontWeight: 600, color: 'var(--vscode-editor-foreground)' }}>
                            4. 逻辑审查 / 连贯性检查 (Evaluation)
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
                        <p style={s.hint}>推荐使用智谱 GLM-5 或 Claude 等长逻辑连贯性强的模型。</p>
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <div style={{
                marginTop: '12px', padding: '10px 14px',
                background: 'var(--vscode-textBlockQuote-background)',
                borderLeft: '3px solid var(--vscode-activityBarBadge-background)',
                borderRadius: '0 4px 4px 0',
                fontSize: '11px', color: 'var(--vscode-descriptionForeground)', lineHeight: '1.6',
            }}>
                {lang === 'zh'
                    ? '路由规则：按任务类型匹配已启用的模型，选优先级最高的（列表靠上）。可随时添加新模型、自定义任务分配。'
                    : 'Routing: L-Hub matches the task type to enabled models and picks the highest-priority one (top of list). You can add any model and customize task assignments.'}
            </div>
        </div>
    );
};

export default RoutingGuidePanel;
