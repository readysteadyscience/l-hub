import React, { useState, useEffect } from 'react';
import { colors, radius, s } from '../theme';
import { Lang } from './Dashboard';
import { vscode } from '../vscode-api';

interface SkillPanelProps {
    lang: Lang;
    routingPrefs?: any;
    models?: any[];
}

const SkillPanel: React.FC<SkillPanelProps> = ({ lang, routingPrefs, models }) => {
    const isEN = lang === 'en';
    
    // Ensure we start with defaults 'auto'
    const defaultPrefs = routingPrefs || {
        routine: 'auto',
        code: 'auto',
        reasoning: 'auto',
        creative: 'auto',
        pipeline_logic: 'auto',
        pipeline_writer: 'auto'
    };

    const [isEditing, setIsEditing] = useState(false);
    const [localPrefs, setLocalPrefs] = useState(defaultPrefs);

    useEffect(() => {
        if (routingPrefs && !isEditing) {
            setLocalPrefs(routingPrefs);
        }
    }, [routingPrefs, isEditing]);

    const title = isEN ? 'Built-in Routing Skill' : '内置调度 Skill';
    const desc = isEN
        ? 'L-Hub auto-installs an Antigravity Skill that teaches the host model to delegate tasks intelligently. The default selections below represent our official optimal configuration across the supported models. If you lack certain API keys, click "Edit Config" to assign tasks to the models you currently have.'
        : 'L-Hub 随同安装的内置 Skill 能教会主模型智能委派任务，以最大化节省额度。下方展示的默认选项为 L-Hub 官方设定的最优配置（基于支持的几款顶级模型）。若您没有对应的 API Key，请点击右上角「编辑配置」，根据您现有的可用模型进行自定义分配。';

    const handleSave = () => {
        vscode.postMessage({ command: 'saveRoutingPrefs', prefs: localPrefs });
        setIsEditing(false);
        // saveRoutingPrefs automatically rebuilds SKILL.md
    };

    // Helper to render dropdown or static text
    const renderOption = (key: string, defaultVal: string, labelEN: string, labelZH: string) => {
        const titleText = isEN ? labelEN : labelZH;
        let currentVal = localPrefs[key] || defaultVal;
        
        // Normalize legacy provider names to exact model IDs for dropdown matching
        if (currentVal === 'deepseek') currentVal = 'deepseek-chat';
        if (currentVal === 'qwen') currentVal = 'qwen-max';
        if (currentVal === 'glm') currentVal = 'glm-5';
        
        // Find the model object by exact id, modelId, or fuzzy matching the provider group/prefix
        const selectedModel = models?.find(m => m.id === currentVal || m.modelId === currentVal || m.id.startsWith(currentVal + '-') || m.modelId?.startsWith(currentVal + '-'));
        let statusText = '';
        if (selectedModel) {
            if (selectedModel.group === 'cli') {
                statusText = selectedModel.status === 'online' ? '( [OK] ENABLED )' : '( [ERR] OFFLINE )';
            } else {
                statusText = selectedModel.status === 'online' ? '( [OK] KEY_FOUND )' : '( [ERR] NO_KEY )';
            }
        } else if (currentVal === 'auto') {
            statusText = '( L-HUB_ROUTING_DYNAMIC )';
        } else {
            statusText = '( [ERR] DISABLED_OR_MISSING )';
        }

        const displayLabel = currentVal === 'auto' ? 'AUTO / DYNAMIC_RESOLVE' : (selectedModel?.label || currentVal);

        if (!isEditing) {
            return (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--vscode-editor-foreground)', marginBottom: '4px' }}>
                        [ {titleText} ]
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)' }}>
                        <span style={{ color: selectedModel?.status === 'online' || currentVal === 'auto' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                            &gt; {displayLabel}
                        </span>
                        <span style={{ opacity: 0.7, marginLeft: '6px' }}>{statusText}</span>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--vscode-editor-foreground)', marginBottom: '6px' }}>
                    [ {titleText} ]
                </div>
                <select 
                    value={localPrefs[key] || defaultVal}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, [key]: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '6px',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}
                >
                    <option value="auto">Auto (L-Hub 动态推荐)</option>
                    <optgroup label="CLIs & Tools">
                        {models?.filter(m => m.group === 'cli').map(m => (
                            <option key={m.id} value={m.id}>
                                {m.label} {m.status === 'online' ? '[OK]' : '[ERR]'}
                            </option>
                        ))}
                    </optgroup>
                    <optgroup label="Cloud Models">
                        {models?.filter(m => m.group !== 'cli').map(m => (
                            <option key={m.id} value={m.id}>
                                {m.label} {m.status === 'online' ? '[OK]' : '[ERR]'}
                            </option>
                        ))}
                    </optgroup>
                </select>
            </div>
        );
    };

    const isCustom = localPrefs.routine !== 'deepseek' || localPrefs.code !== 'codex-cli' || localPrefs.reasoning !== 'gemini-cli' || localPrefs.creative !== 'minimax';
    const configTitle = isCustom ? (isEN ? 'CUSTOM_ROUTING_CONFIG' : '自定义路由调度树') : (isEN ? 'OFFICIAL_OPTIMAL_CONFIG' : 'SYS_BUILTIN_OPTIMAL_ROUTING');

    const tip = isEN
        ? '> HOST_NODE_EXCLUSIVE (never delegated): Architecture Design · Final Decisions · Conversational Context'
        : '> 主节点专属进程（绝对独占）：核心架构设计 · 最终方案裁决 · 直接对话接管';

    const philosophy = isEN
        ? '> DYNAMIC_EXECUTION: Generated SKILL.md adheres to selections. Switch to active keys if missing defaults.'
        : '> DYNAMIC_EXECUTION: 系统将根据您的选择硬核注入 SKILL.md。如缺省对应节点 Key，请手动切换至存活节点。';

    return (
        <div className="animate-in" style={{ maxWidth: '860px', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '12px' }}>
                <div style={{
                    fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                }}>
                    {title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                    &gt; {desc}
                </div>
            </div>

            {/* Routing Config Box */}
            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--vscode-editor-foreground)', letterSpacing: '0.5px' }}>
                        &gt; {configTitle}
                    </div>
                    <div>
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                style={{
                                    padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                [ {isEN ? 'EDIT' : '配置覆盖'} ]
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={() => { setIsEditing(false); setLocalPrefs(routingPrefs); }}
                                    style={{
                                        padding: '4px 10px', background: 'transparent', color: 'var(--vscode-descriptionForeground)', border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    [ {isEN ? 'CANCEL' : '取消'} ]
                                </button>
                                <button 
                                    onClick={handleSave}
                                    style={{
                                        padding: '4px 10px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: '1px solid var(--vscode-button-border, transparent)', borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    [ {isEN ? 'SAVE_AND_DEPLOY' : '编译并注入'} ]
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {renderOption('routine', 'deepseek', 'Routine Tasks / Translation (Low-cost Tier)', '体力活 / 翻译 / 总结 (低成本梯队)')}
                    {renderOption('code', 'codex-cli', 'Code Engineering / Debugging (Quality First)', '代码生成 / 审查 / Bug检查 (纯净工程)')}
                    {renderOption('reasoning', 'gemini-cli', 'Complex Reasoning / UI / Math', '深度推理 / 前端 UI / 数学算法')}
                    {renderOption('creative', 'minimax', 'Creative Writing / Outlines / Stories', '创意写作 / 大纲设定 / 中文文笔')}
                    {renderOption('pipeline_logic', 'auto', 'Article Pipeline: Chief Editor / Extracting Facts', 'L-Ink管线专属：主编提取与摘要 (爬虫节点)')}
                    {renderOption('pipeline_writer', 'auto', 'Article Pipeline: Creative Writer / Markdown', 'L-Ink管线专属：主笔长文与排版 (渲染节点)')}
                </div>
            </div>

            <div style={{
                borderLeft: '3px solid var(--vscode-editor-foreground)',
                padding: '12px 16px',
                marginBottom: '10px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--vscode-editor-foreground)',
            }}>
                {tip}
            </div>

            <div style={{
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
                fontFamily: 'monospace',
                textAlign: 'left',
            }}>
                {philosophy}
            </div>
        </div>
    );
};

export default SkillPanel;

