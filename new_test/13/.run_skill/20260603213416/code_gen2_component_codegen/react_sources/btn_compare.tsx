import React from 'react';

export default function GeneratedComponent() {
  return (
    <button
      data-component-id="btn_compare"
      className="tf-cg-icon-btn"
      style={{
        position: 'absolute',
        left: 16,
        top: 880,
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
      }}
      onClick={() => {}}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="10" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <path d="M10 8h4" />
        <path d="M14 16h-4" />
      </svg>
      <span
        className="tf-cg-icon-btn-label"
        style={{
          fontSize: 'var(--font-caption-10)',
          lineHeight: 'var(--line-height-12)',
          fontWeight: 'var(--font-weight-regular)',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        产品对比
      </span>
    </button>
  );
}