import React from 'react';

export default function ActionCompare() {
  return (
    <div 
      data-component-id="action_compare" 
      className="tf-cg-icon-text-btn"
      style={{
        position: 'absolute',
        left: 16,
        top: 1308,
        width: 48,
        height: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        cursor: 'pointer',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)' }}>
        <path d="M7 10h14M7 10l3-3M7 10l3 3M17 14H3M17 14l-3-3M17 14l-3 3"/>
      </svg>
      <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)', lineHeight: '12px' }}>对比</span>
    </div>
  );
}