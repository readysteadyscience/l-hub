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
    group?: string;
    status?: string;
}

interface CreativeWritingConfig {
    outlineModels: string[];
    draftModels: string[];
    polishModel: string;
    evalModel: string;
}

const RoutingGuidePanel: React.FC<{ lang: Lang; routingPrefs?: any; models?: any[]; localSkills?: Array<{ id: string; name: string }> }> = ({ lang, routingPrefs, models: propsModels, localSkills = [] }) => {

    const [models, setModels] = React.useState<ModelConfig[]>(propsModels || []);
    const [localPrefs, setLocalPrefs] = React.useState<any>(routingPrefs || {});
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

    const availableModels = models.filter(m => m.enabled || (m.group === 'cli' && m.status === 'online'));

    React.useEffect(() => {
        if (routingPrefs) setLocalPrefs(routingPrefs);
    }, [routingPrefs]);

    React.useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.data.command === 'loadModelsV2') {
                setModels(ev.data.models || []);
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'getModelsV2' });
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

            {/* L-Ink Writing System */}
            <div style={{ marginTop: '32px' }}>
                {/* Collapsible header */}
                <div
                    onClick={() => setCollapsed(c => ({ ...c, lhub_lhink: !c.lhub_lhink }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: collapsed.lhub_lhink ? '0' : '16px', borderBottom: collapsed.lhub_lhink ? 'none' : '1px solid var(--vscode-panel-border)', paddingBottom: '12px', cursor: 'pointer', userSelect: 'none' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                            fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                            color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                        }}>
                            {lang === 'zh' ? 'L-Ink 写作系统' : 'L-INK WRITING SYSTEM'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                            &gt; {lang === 'zh' ? 'L-Ink 定向/雷达长篇文章生产系统 - 双轨节点组态' : 'L-Ink Targeted / Radar Long-form Article Production System'}
                        </div>
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--vscode-descriptionForeground)', opacity: 0.7 }}>
                        {collapsed.lhub_lhink ? '▶' : '▼'}
                    </span>
                </div>
                
                {!collapsed.lhub_lhink && <div style={{
                    padding: '16px', borderRadius: radius.sm,
                    background: 'var(--vscode-editor-background)',
                    border: '1px solid var(--vscode-panel-border)',
                    display: 'flex', flexDirection: 'column', gap: '20px',
                }}>
                    {/* 01 信息搜集 */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            {lang === 'zh' ? '[ 01_信息搜集 ]' : '[ 01_INFO_GATHERING ]'}
                        </label>
                        <select
                            style={s.select}
                            value={localPrefs.pipeline_logic || 'auto'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setLocalPrefs({ ...localPrefs, pipeline_logic: v });
                                vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, pipeline_logic: v } });
                            }}
                        >
                            <option value="auto">{lang === 'zh' ? '自动匹配推理/搜索节点 (基于 Reasoning 标签)' : 'AUTO (Based on Reasoning tags)'}</option>
                            {availableModels.map(m => (<option key={m.id} value={m.modelId}>{m.label} [{m.modelId}]</option>))}
                        </select>
                        <p style={{ margin: '6px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; {lang === 'zh' ? '全网调查、事实溯源、RSS/页面内容提取，输出结构化写作蓝图。' : 'Web research, fact sourcing, RSS/page extraction, outputs structured writing blueprint.'}
                        </p>
                    </div>

                    {/* 02 文章写作与排版 */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            {lang === 'zh' ? '[ 02_文章写作与排版 ]' : '[ 02_WRITING_AND_LAYOUT ]'}
                        </label>
                        <select
                            style={s.select}
                            value={localPrefs.pipeline_writer || 'auto'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setLocalPrefs({ ...localPrefs, pipeline_writer: v });
                                vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, pipeline_writer: v } });
                            }}
                        >
                            <option value="auto">{lang === 'zh' ? '自动匹配创作节点 (基于 Creative Writing 标签)' : 'AUTO (Based on Creative Writing tags)'}</option>
                            {availableModels.map(m => (<option key={m.id} value={m.modelId}>{m.label} [{m.modelId}]</option>))}
                        </select>
                        <p style={{ margin: '6px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; {lang === 'zh' ? '接收蓝图，执行媒体级排版协议，输出完整长篇 Markdown 定稿。' : 'Receives blueprint, applies media-grade layout rules, renders full long-form Markdown.'}
                        </p>
                    </div>

                    {/* 03 语言优化 */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            {lang === 'zh' ? '[ 03_语言优化 ]' : '[ 03_LANGUAGE_POLISH ]'}
                        </label>
                        <select
                            style={s.select}
                            value={localPrefs.pipeline_language || 'auto'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setLocalPrefs({ ...localPrefs, pipeline_language: v });
                                vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, pipeline_language: v } });
                            }}
                        >
                            <option value="auto">{lang === 'zh' ? '自动匹配润色节点 (基于 Creative Writing/Translation 标签)' : 'AUTO (Based on Creative/Translation tags)'}</option>
                            <option value="">{lang === 'zh' ? '(跳过此环节)' : '(Skip)'}</option>
                            {availableModels.map(m => (<option key={m.id} value={m.modelId}>{m.label} [{m.modelId}]</option>))}
                        </select>
                        <p style={{ margin: '6px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; {lang === 'zh' ? '语言地道性优化、句感打磨、去除模板化表达，使文章读感饱满自然。' : 'Language naturalness, sentence rhythm, de-templating for a more human reading experience.'}
                        </p>
                    </div>

                    {/* 04 图片配图 */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            {lang === 'zh' ? '[ 04_图片配图 ]（可选）' : '[ 04_IMAGE_RETRIEVAL ]  (optional)'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-editor-foreground)' }}>
                                <input
                                    type="checkbox"
                                    checked={!!localPrefs.pipeline_image_enabled}
                                    onChange={(e) => {
                                        const v = e.target.checked;
                                        setLocalPrefs({ ...localPrefs, pipeline_image_enabled: v });
                                        vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, pipeline_image_enabled: v } });
                                    }}
                                />
                                {lang === 'zh' ? '启用自动配图' : 'Enable auto image retrieval'}
                            </label>
                            {!!localPrefs.pipeline_image_enabled && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-editor-foreground)' }}>
                                    {lang === 'zh' ? '张数：' : 'Count:'}
                                    <input
                                        type="number"
                                        min={1} max={10}
                                        value={localPrefs.pipeline_image_count ?? 3}
                                        onChange={(e) => {
                                            const v = Math.max(1, Math.min(10, Number(e.target.value)));
                                            setLocalPrefs({ ...localPrefs, pipeline_image_count: v });
                                            vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, pipeline_image_count: v } });
                                        }}
                                        style={{ width: '48px', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', fontFamily: 'monospace', fontSize: '11px' }}
                                    />
                                </label>
                            )}
                        </div>
                        <p style={{ margin: '0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; {lang === 'zh' ? '根据文章核心关键词自动检索并下载匹配的配图，插入至文章末尾或语义段落节点。' : 'Automatically retrieves images matching the article keywords and injects them into the article.'}
                        </p>
                    </div>

                    {/* 05 政审与质检 */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '8px' }}>
                            {lang === 'zh' ? '[ 05_政审与质检 ]' : '[ 05_COMPLIANCE_AND_QA ]'}
                        </label>
                        <select
                            style={s.select}
                            value={localPrefs.pipeline_review || 'auto'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setLocalPrefs({ ...localPrefs, pipeline_review: v });
                                vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, pipeline_review: v } });
                            }}
                        >
                            <option value="auto">{lang === 'zh' ? '自动匹配推理节点 (基于 Reasoning 标签)' : 'AUTO (Based on Reasoning tags)'}</option>
                            <option value="">{lang === 'zh' ? '(跳过此环节)' : '(Skip)'}</option>
                            {availableModels.map(m => (<option key={m.id} value={m.modelId}>{m.label} [{m.modelId}]</option>))}
                        </select>
                        <p style={{ margin: '6px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; {lang === 'zh'
                                ? '政策合规扫描 · 自然语言与"人话"检查 · 信息准确性核验 · 识别并删除所有 AI 的分析性话术（如"综上所述"、"值得注意的是"等）。'
                                : 'Compliance scan · Natural language check · Accuracy verification · Purge AI analytical phrases ("In summary", "It is worth noting", etc.).'}
                        </p>
                    </div>

                    {/* 06 Skill 绑定 */}
                    <div style={{ borderTop: '1px solid var(--vscode-panel-border)', paddingTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)', marginBottom: '6px' }}>
                            {lang === 'zh' ? '[ 06_Skill 绑定 ]' : '[ 06_SKILL_BINDING ]'}
                        </label>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                            &gt; {lang === 'zh'
                                ? '选择你的私有写作 Skill 并绑定到此管线。被触发时系统强制委派给上面节点，主模型不会直接写文章。'
                                : 'Select a writing Skill to bind. When triggered, the host will delegate to the pipeline above instead of writing directly.'}
                        </p>
                        {localSkills.length === 0 ? (
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', opacity: 0.6 }}>
                                &gt; {lang === 'zh' ? '未检测到任何本地技能（~/.gemini/antigravity/skills/）' : 'No local skills found at ~/.gemini/antigravity/skills/'}
                            </div>
                        ) : (() => {
                            const boundSkills: string[] = localPrefs.pipeline_bound_skills || [];
                            const unbound = localSkills.filter(s => !boundSkills.includes(s.id));
                            const addSkill = (skillId: string) => {
                                if (!skillId || boundSkills.includes(skillId)) return;
                                const next = [...boundSkills, skillId];
                                const nextPrefs = { ...localPrefs, pipeline_bound_skills: next };
                                setLocalPrefs(nextPrefs);
                                vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, ...nextPrefs } });
                            };
                            const removeSkill = (skillId: string) => {
                                const next = boundSkills.filter((s: string) => s !== skillId);
                                const nextPrefs = { ...localPrefs, pipeline_bound_skills: next };
                                setLocalPrefs(nextPrefs);
                                vscode.postMessage({ command: 'saveRoutingPrefs', prefs: { ...routingPrefs, ...nextPrefs } });
                            };
                            return (
                                <div>
                                    <select
                                        style={{ ...s.select, marginBottom: '10px' }}
                                        value=""
                                        onChange={(e) => { addSkill(e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                                    >
                                        <option value="">{lang === 'zh' ? `+ 从 ${localSkills.length} 个本地技能中选择并添加...` : `+ Select from ${localSkills.length} local skills to bind...`}</option>
                                        {unbound.map(skill => (<option key={skill.id} value={skill.id}>{skill.name}</option>))}
                                    </select>
                                    {boundSkills.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {boundSkills.map((skillId: string) => {
                                                const skill = localSkills.find(s => s.id === skillId);
                                                const label = skill ? skill.name : skillId;
                                                return (
                                                    <span key={skillId} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '3px 8px', borderRadius: radius.sm,
                                                        fontSize: '11px', fontFamily: 'monospace', fontWeight: 600,
                                                        background: 'rgba(16, 185, 129, 0.12)', color: '#10B981',
                                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                                    }}>
                                                        [x] {label}
                                                        <span onClick={() => removeSkill(skillId)} style={{ cursor: 'pointer', opacity: 0.7, fontSize: '12px', lineHeight: 1 }} title={lang === 'zh' ? '解除绑定' : 'Unbind'}>✕</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>}
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
