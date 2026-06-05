import React from 'react';
export default function GeneratedComponent() {
  return (
    <div
      data-component-id="success_toast"
      className="tf-cg-toast"
      style={{
        position: 'absolute',
        left: 16,
        top: 52,
        width: 328,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-md)',
        padding: '0 20px',
        boxSizing: 'border-box',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="var(--color-success)" />
        <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        className="font-headline-xs"
        style={{ color: 'var(--color-text-primary)' }}
      >
        方案生成成功
      </span>
    </div>
  );
}