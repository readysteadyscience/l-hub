import React, { useState, useEffect } from 'react';
import { vscode } from '../vscode-api';
import { VSCodeDivider, VSCodeButton } from '@vscode/webview-ui-toolkit/react';

const ConfigPanel: React.FC = () => {
    const [keys, setKeys] = useState<{ [key: string]: string }>({ deepseek: '', glm: '', qwen: '', minimax: '' });

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'loadApiKeys') {
                setKeys(prev => ({ ...prev, ...message.data }));
            }
        };
        window.addEventListener('message', handleMessage);
        vscode.postMessage({ command: 'getApiKeys' });
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSave = (provider: string, val: string) => {
        setKeys({ ...keys, [provider]: val });
        vscode.postMessage({ command: 'saveApiKey', provider, key: val });
    };

    const BranchConfig = ({
        title,
        icon,
        description,
        recommendation,
        providerLabel,
        providerKey
    }: {
        title: string, icon: string, description: string, recommendation: string, providerLabel: string, providerKey: string
    }) => (
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)', borderRadius: '6px' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{icon}</span> {title}
            </h3>
            <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '13px', margin: '8px 0' }}>
                <strong>📌 分支用途：</strong> {description}
            </p>
            <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '13px', margin: '8px 0 15px 0' }}>
                <strong>💎 推荐模型：</strong> <span style={{ color: 'var(--vscode-textPreformat-foreground)', padding: '2px 4px', background: 'var(--vscode-textCodeBlock-background)', borderRadius: '3px' }}>{recommendation}</span>
            </p>
            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>配置 {providerLabel} API Key</label>
                <input
                    type="password"
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        outline: 'none',
                        borderRadius: '2px',
                        boxSizing: 'border-box'
                    }}
                    value={keys[providerKey] || ''}
                    onChange={(e) => handleSave(providerKey, e.target.value)}
                    placeholder={`sk-...`}
                />
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '750px', paddingBottom: '40px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ marginTop: 0, marginBottom: '10px' }}>🧠 专家模型分支配置 (L-Hub Matrix)</h1>
                <p style={{ color: 'var(--vscode-descriptionForeground)', lineHeight: '1.5', fontSize: '14px' }}>
                    L-Hub 根据“模型上下文路由架构”运行。您的主控端 (Cursor / VS Code / Antigravity) 下发的复杂意图，会被 L-Hub 智能解析，并自动分发给下方最适合该任务的专家子模型。<br />
                    请在此安全地配置各垂直领域大模型的 API Key。您的凭据被最高级别的数字保险箱 (VS Code Credential Store) 加密保管，<b>绝文明文落盘</b>。
                </p>
            </div>

            <BranchConfig
                title="代码与逻辑分支"
                icon="🔵"
                description="兜底执行日常的编程生成、逻辑改写与基础查错。处理超过 70% 的核心请求。"
                recommendation="DeepSeek-V3 / Coder (性价比之王)"
                providerLabel="DeepSeek"
                providerKey="deepseek"
            />

            <BranchConfig
                title="架构与工程分支"
                icon="🟢"
                description="当您的需求涉及多文件重构、底层架构设计或极其庞大的 Agentic 长文本逻辑分析时触发。"
                recommendation="GLM-4 / GLM-5"
                providerLabel="GLM (智谱)"
                providerKey="glm"
            />

            <BranchConfig
                title="多语言与文档分支"
                icon="🟣"
                description="翻译外国源码注释、阅读英文报错日志，并结合 API 接口文档生成最佳调用实践。"
                recommendation="Qwen-Max (通义千问)"
                providerLabel="Qwen"
                providerKey="qwen"
            />

            <BranchConfig
                title="UI 与视觉设计分支"
                icon="🟠"
                description="应对全栈方案规划、前端 React/Vue 组件生成，以及任何有关“样式”、“布局”、“视觉效果”的请求。"
                recommendation="MiniMax (abab6.5-chat / 海螺大模型)"
                providerLabel="MiniMax"
                providerKey="minimax"
            />

            <VSCodeDivider style={{ margin: '30px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'var(--vscode-textBlockQuote-background)', padding: '20px', borderRadius: '6px', borderLeft: '4px solid var(--vscode-button-background)' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>❤️ 支持 L-Hub 开源项目</h3>
                <p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '13px', lineHeight: '1.5' }}>
                    L-Hub 是完全开源的，致力于帮您省下不必要的昂贵模型调用费（比如自动把日常代码交给更便宜的 DeepSeek 处理）。
                    如果你喜欢这个工具，不妨支持我们一下：
                </p>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <VSCodeButton appearance="secondary" onClick={() => vscode.postMessage({ command: 'openUrl', url: 'https://github.com' })}>⭐ 去 GitHub 点个 Star</VSCodeButton>
                    <VSCodeButton appearance="primary" onClick={() => vscode.postMessage({ command: 'openUrl', url: 'https://example.com/sponsor' })}>☕ 请作者喝杯咖啡</VSCodeButton>
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
                全局路由配置 (比如默认主模型选择、历史清理天数) 请通过 VS Code 设置页面 (⌘,) 并搜索 <code>L-Hub</code> 调整。
            </div>
        </div>
    );
};

export default ConfigPanel;

