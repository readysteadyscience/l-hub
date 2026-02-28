import React, { useState } from 'react';
import ConfigPanel from './ConfigPanel';
import HistoryConsole from './HistoryConsole';

const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'config' | 'history'>('history');

    return (
        <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--vscode-panel-border)', marginBottom: '20px' }}>
                <div
                    onClick={() => setActiveTab('history')}
                    style={{ padding: '10px 20px', cursor: 'pointer', borderBottom: activeTab === 'history' ? '2px solid var(--vscode-focusBorder)' : 'none', color: activeTab === 'history' ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)', fontWeight: 'bold' }}
                >
                    History Console
                </div>
                <div
                    onClick={() => setActiveTab('config')}
                    style={{ padding: '10px 20px', cursor: 'pointer', borderBottom: activeTab === 'config' ? '2px solid var(--vscode-focusBorder)' : 'none', color: activeTab === 'config' ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)', fontWeight: 'bold' }}
                >
                    Settings & API Keys
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                {activeTab === 'config' && <ConfigPanel />}
                {activeTab === 'history' && <HistoryConsole />}
            </div>
        </div>
    );
};

export default Dashboard;
