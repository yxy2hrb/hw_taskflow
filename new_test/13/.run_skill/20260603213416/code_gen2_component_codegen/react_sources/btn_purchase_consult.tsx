import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="btn_purchase_consult"
      style={{
        position: 'absolute',
        left: 72,
        top: 880,
        width: 48,
        height: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <button
        className="tf-cg-icon-btn"
        style={{
          width: 48,
          height: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          borderRadius: 'var(--radius-md)',
          transition: 'transform 150ms ease',
        }}
        aria-label="采购咨询"
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </div>
        <span
          className="font-caption-s"
          style={{
            color: 'var(--color-text-secondary)',
            whiteSpace: 'nowrap',
            lineHeight: '12px',
          }}
        >
          采购咨询
        </span>
      </button>
    </div>
  );
}