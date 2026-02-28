import React, { useState } from 'react';
import ConfigPanel from './ConfigPanel';
import HistoryConsole from './HistoryConsole';

export type Lang = 'en' | 'zh';

const t = {
    en: {
        history: 'History Console',
        settings: 'Settings & API Keys',
    },
    zh: {
        history: '调用历史',
        settings: '设置 & API Key',
    }
};

const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'config' | 'history'>('history');
    const [lang, setLang] = useState<Lang>('zh');

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '10px 20px',
        cursor: 'pointer',
        borderBottom: active ? '2px solid var(--vscode-focusBorder)' : 'none',
        color: active ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
        fontWeight: 'bold',
        userSelect: 'none',
    });

    const langBtnStyle = (active: boolean): React.CSSProperties => ({
        padding: '4px 10px',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        background: active ? 'var(--vscode-focusBorder)' : 'transparent',
        color: active ? '#fff' : 'var(--vscode-descriptionForeground)',
        marginLeft: '4px',
        userSelect: 'none',
    });

    return (
        <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            {/* Tab bar + Language toggle */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--vscode-panel-border)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flex: 1 }}>
                    <div onClick={() => setActiveTab('history')} style={tabStyle(activeTab === 'history')}>
                        {t[lang].history}
                    </div>
                    <div onClick={() => setActiveTab('config')} style={tabStyle(activeTab === 'config')}>
                        {t[lang].settings}
                    </div>
                </div>
                {/* Language toggle */}
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px' }}>
                    <span onClick={() => setLang('en')} style={langBtnStyle(lang === 'en')}>EN</span>
                    <span onClick={() => setLang('zh')} style={langBtnStyle(lang === 'zh')}>中文</span>
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                {activeTab === 'config' && <ConfigPanel lang={lang} />}
                {activeTab === 'history' && <HistoryConsole lang={lang} />}
            </div>
        </div>
    );
};

export default Dashboard;
