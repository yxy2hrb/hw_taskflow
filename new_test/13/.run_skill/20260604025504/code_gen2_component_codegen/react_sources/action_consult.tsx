import React from 'react';

export default function ActionConsult() {
  return (
    <div 
      data-component-id="action_consult" 
      className="tf-cg-icon-text-btn"
      style={{
        position: 'absolute',
        left: 72,
        top: 1308,
        width: 48,
        height: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: 'var(--color-text-primary)',
        cursor: 'pointer'
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span style={{ fontSize: 10, lineHeight: '12px', fontWeight: 400 }}>咨询</span>
    </div>
  );
}