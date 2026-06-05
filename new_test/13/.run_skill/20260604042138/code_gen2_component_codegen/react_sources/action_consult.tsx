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
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
      <span className="font-caption-s" style={{ color: 'var(--color-text-primary)', lineHeight: '12px' }}>咨询</span>
    </div>
  );
}