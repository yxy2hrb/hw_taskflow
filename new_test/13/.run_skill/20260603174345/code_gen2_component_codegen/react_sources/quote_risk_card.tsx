import React from 'react';
export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="quote_risk_card" 
      className="tf-cg-risk-card"
      style={{
        position: 'absolute',
        left: 16,
        top: 232,
        width: 328,
        height: 80,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-lg)',
        boxShadow: 'var(--shadow-sm)',
        boxSizing: 'border-box'
      }}
    >
      <div 
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="font-headline-xs" style={{ color: 'var(--color-text-primary)' }}>
          风险提示
        </span>
        <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
          当前配单暂无异常风险
        </span>
      </div>
    </div>
  );
}