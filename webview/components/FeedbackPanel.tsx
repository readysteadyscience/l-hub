import React, { useState, useEffect } from 'react';
import { vscode } from '../vscode-api';
import { Lang } from './Dashboard';
import { s, colors, radius, shadow } from '../theme';

const FeedbackPanel: React.FC<{ lang: Lang }> = ({ lang }) => {
    const isEN = lang === 'en';
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const T = {
        en: { 
            title: 'Feedback & Bug Report', 
            desc: 'Tell us about your issue or suggestions. Your feedback will be sent directly to LinglanCore telemetry.', 
            placeholder: 'Type your feedback here...', 
            submit: 'Submit Feedback' 
        },
        zh: { 
            title: '反馈与问题报告', 
            desc: '遇到问题或者有新想法？请提交给我们，您的反馈将实时传送至 LinglanCore 调度中心处理。', 
            placeholder: '请详细描述您遇到的情况或建议...', 
            submit: '提交反馈' 
        },
    }[lang];

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.command === 'feedbackSuccess') {
                setIsSubmitting(false);
                setText('');
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSubmit = () => {
        if (!text.trim() || isSubmitting) return;
        setIsSubmitting(true);
        vscode.postMessage({ command: 'submitFeedback', text: text.trim() });
    };

    return (
        <div className="animate-in" style={{ maxWidth: '860px', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px', borderBottom: '1px solid var(--vscode-panel-border)', paddingBottom: '12px' }}>
                <div style={{
                    fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'var(--vscode-editor-foreground)', fontFamily: 'monospace'
                }}>
                    [ {isEN ? 'SYS_TELEMETRY_FEEDBACK' : '系统终端工单指派'} ]
                </div>
                <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                    &gt; {T.desc}
                </div>
            </div>

            <div style={{
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: radius.sm,
                padding: '16px',
            }}>

            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={T.placeholder}
                disabled={isSubmitting}
                style={{
                    width: '100%',
                    height: '240px',
                    padding: '16px',
                    resize: 'vertical',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    marginBottom: '16px',
                    background: 'var(--vscode-editor-inactiveSelectionBackground)',
                    color: 'var(--vscode-editor-foreground)',
                    border: '1px dashed var(--vscode-panel-border)',
                    borderRadius: radius.sm,
                    outline: 'none',
                    opacity: isSubmitting ? 0.7 : 1,
                }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isSubmitting}
                    style={{
                        padding: '8px 16px',
                        background: (!text.trim() || isSubmitting) ? 'transparent' : 'var(--vscode-button-background)',
                        color: (!text.trim() || isSubmitting) ? 'var(--vscode-descriptionForeground)' : 'var(--vscode-button-foreground)',
                        border: (!text.trim() || isSubmitting) ? '1px solid var(--vscode-panel-border)' : '1px solid var(--vscode-button-border, transparent)',
                        borderRadius: radius.sm,
                        cursor: (!text.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        transition: 'all 0.2s',
                    }}
                >
                    {isSubmitting ? '[ TRANSMITTING... ]' : `[ ${isEN ? 'SUBMIT_TELEMETRY' : '派发工单'} ]`}
                </button>
            </div>
          </div>
        </div>
    );
};

export default FeedbackPanel;
