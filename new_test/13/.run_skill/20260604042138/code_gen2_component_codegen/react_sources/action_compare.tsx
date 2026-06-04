import React from 'react';

export default function ActionCompare() {
  return (
    <div 
      data-component-id="action_compare"
      className="tf-cg-action-compare"
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
        color: 'var(--color-text-primary)'
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
      <span className="font-caption-m" style={{ whiteSpace: 'nowrap' }}>对比</span>
    </div>
  );
}