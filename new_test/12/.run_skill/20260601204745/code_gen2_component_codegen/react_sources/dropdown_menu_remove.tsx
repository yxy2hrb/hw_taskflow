import React from 'react';

export default function GeneratedComponent() {
  const noop = () => {};

  return (
    <div
      data-component-id="dropdown_menu_remove"
      className="tf-cg-dropdown-menu"
      style={{
        position: 'absolute',
        left: 220,
        top: 720,
        width: 120,
        height: 40,
        zIndex: 60,
      }}
    >
      <div
        className="tf-cg-dropdown-inner"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={noop}
          className="tf-cg-dropdown-item"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 var(--spacing-lg)',
            gap: 'var(--spacing-md)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-error)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          <span
            style={{
              fontSize: 'var(--font-body-14)',
              lineHeight: 'var(--line-height-18)',
              fontWeight: 'var(--font-weight-regular)',
              color: 'var(--color-error)',
              whiteSpace: 'nowrap',
            }}
          >
            移除
          </span>
        </button>
      </div>
    </div>
  );
}