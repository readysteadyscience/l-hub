import React, { useState } from 'react';
import { colors, radius, s } from '../theme';
import { Lang } from './Dashboard';
import { vscode } from '../vscode-api';

const TestPanel: React.FC<{ lang: Lang }> = ({ lang }) => {
    const isEN = lang === 'en';
    const [copied, setCopied] = useState(false);

    const title = isEN ? 'Standard Test & Diagnostics' : '标准测试 & 诊断';
    const desc = isEN
        ? 'After installing L-Hub, paste the test prompt below into the Antigravity chat to verify all MCP tools work correctly.'
        : '安装 L-Hub 后，将以下测试 Prompt 粘贴到 Antigravity 聊天框中，主模型会自动测试所有功能并生成报告。';

    const testPrompt = isEN
        ? `Run a complete L-Hub feature test. For each item below, test and report the result. Skip tasks matching unconfigured providers/CLIs:

1. mcp_lhub_ai_list_providers() — list all configured models
2. mcp_lhub_ai_ask(message="Reply: L-Hub connectivity test OK") — auto-route
3. mcp_lhub_ai_multi_ask(message="What is 1+1? Reply with just the number") — multi-model
4. mcp_lhub_ai_consensus(message="Difference between const and let in JS? One sentence.") — v2 voting
5. mcp_lhub_ai_codex_task(task="echo L-Hub Codex test OK") — Codex CLI (SKIP if not installed)
6. mcp_lhub_ai_gemini_task(prompt="Reply: Gemini CLI test OK") — Gemini CLI (SKIP if not installed)

After testing, output a report table:
| Test Item | Status | Time | Notes |
Then summarize: X/6 passed (X skipped).`
        : `请执行 L-Hub 完整功能验证测试，逐项测试以下功能。如遇到未配置的模型或未安装的 CLI，请自动跳过（标记为 SKIP）：

1. 调用 mcp_lhub_ai_list_providers()，列出所有已启用配置
2. 调用 mcp_lhub_ai_ask(message="请回复：L-Hub 连通性测试成功")，测试动态路由
3. 调用 mcp_lhub_ai_multi_ask(message="1+1等于几？请只回答数字")，测试并行多模型
4. 调用 mcp_lhub_ai_consensus(message="JS中const和let的区别？一句话回答")，测试投票引擎
5. 调用 mcp_lhub_ai_codex_task(task="echo L-Hub Codex test OK")，测试 Codex CLI（未安装则 SKIP）
6. 调用 mcp_lhub_ai_gemini_task(prompt="请回复：Gemini CLI 连通测试成功")，测试 Gemini（未安装则 SKIP）

测试完成后按以下格式输出报告：
| 测试项 | 状态 | 耗时 | 备注 |
总结：X/6 通过（X项跳过）`;

    const quickTest = isEN
        ? 'Call mcp_lhub_ai_list_providers() to list all available models, then send "L-Hub test OK" to the first available model via mcp_lhub_ai_ask.'
        : '调用 mcp_lhub_ai_list_providers() 列出所有可用模型，然后用 mcp_lhub_ai_ask 向第一个可用模型发送 "L-Hub 测试成功"。';

    const handleCopy = (text: string) => {
        vscode.postMessage({ command: 'copyToClipboard', text });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDiagnostic = () => {
        vscode.postMessage({ command: 'generateDiagnostics' });
    };

    const stepsTitle = isEN ? 'How to Test' : '测试步骤';
    const steps = isEN
        ? ['Install L-Hub and reload Antigravity', 'Open a chat window', 'Copy the test prompt below', 'Paste into chat and send', 'The AI will auto-test all 6 items and generate a report']
        : ['安装 L-Hub 并重启 Antigravity', '打开聊天窗口', '复制下方测试 Prompt', '粘贴到聊天中发送', '主模型自动测试全部 6 项核心功能并生成报告'];

    return (
        <div className="animate-in" style={{ maxWidth: '860px', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '12px' }}>
                <div style={{
                    fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                }}>
                    [ SYS_DIAGNOSTICS_AND_TEST ]
                </div>
                <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                    &gt; {desc}
                </div>
            </div>

            {/* Steps */}
            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--vscode-editor-foreground)', letterSpacing: '0.5px' }}>
                    &gt; {stepsTitle}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {steps.map((step, i) => (
                        <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--vscode-editor-foreground)', opacity: 0.5 }}>{(i + 1).toString().padStart(2, '0')}</span>
                            <span>{step}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full Test Prompt */}
            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--vscode-editor-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        &gt; {isEN ? 'FULL_TEST_PROMPT (7_ITEMS)' : '完整测试脚本 (7_ITEMS)'}
                    </span>
                    <button
                        onClick={() => handleCopy(testPrompt)}
                        style={{
                            padding: '4px 10px', background: copied ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                            color: copied ? '#10B981' : 'var(--vscode-editor-foreground)', 
                            border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'var(--vscode-panel-border)'}`, 
                            borderRadius: radius.sm, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {copied ? (isEN ? '[ COPIED ]' : '[ 已复制 ]') : (isEN ? '[ COPY ]' : '[ 复制 ]')}
                    </button>
                </div>
                <pre style={{
                    background: 'var(--vscode-editor-inactiveSelectionBackground)', borderRadius: radius.sm, padding: '16px',
                    fontSize: '11px', lineHeight: 1.6, color: 'var(--vscode-descriptionForeground)',
                    fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', 
                    maxHeight: '200px', overflow: 'auto', border: '1px dashed var(--vscode-panel-border)',
                    margin: 0,
                }}>
                    {testPrompt}
                </pre>
            </div>

            {/* Quick Test */}
            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--vscode-editor-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        &gt; {isEN ? 'QUICK_PING_TEST (1_LINE)' : '单行连通性测试 (1_LINE)'}
                    </span>
                    <button
                        onClick={() => handleCopy(quickTest)}
                        style={{
                            padding: '4px 10px', background: 'transparent', color: 'var(--vscode-editor-foreground)', 
                            border: '1px solid var(--vscode-panel-border)', borderRadius: radius.sm, 
                            fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        [ {isEN ? 'COPY' : '复制'} ]
                    </button>
                </div>
                <pre style={{
                    background: 'var(--vscode-editor-inactiveSelectionBackground)', borderRadius: radius.sm, padding: '12px',
                    fontSize: '11px', lineHeight: 1.5, color: 'var(--vscode-descriptionForeground)',
                    fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, border: '1px dashed var(--vscode-panel-border)'
                }}>
                    {quickTest}
                </pre>
            </div>

            {/* Diagnostics */}
            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                padding: '16px',
            }}>
                <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--vscode-editor-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    &gt; {isEN ? 'ONE_CLICK_DIAGNOSTICS' : '一键环境诊断'}
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--vscode-descriptionForeground)', marginBottom: '16px', lineHeight: 1.5 }}>
                    {isEN
                        ? '> Generates a system health report with config statuses and recent errors. Share via GitHub.'
                        : '> 生成包含配置状态、模型连通性、错误日志的诊断报告副本，用于 GitHub Issue 报修支持。'}
                </div>
                <button
                    onClick={handleDiagnostic}
                    style={{
                        padding: '6px 14px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', 
                        border: '1px solid var(--vscode-button-border, transparent)', borderRadius: radius.sm, 
                        fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    [ {isEN ? 'EXECUTE_DIAGNOSTIC_DUMP' : '执行全栈诊断提取'} ]
                </button>
            </div>
        </div>
    );
};

export default TestPanel;
