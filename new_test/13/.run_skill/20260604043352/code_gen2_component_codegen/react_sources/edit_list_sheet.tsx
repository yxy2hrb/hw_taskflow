import React from 'react';

export default function EditListSheet() {
  return (
    <div
      data-component-id="edit_list_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 816,
        width: 360,
        height: 544,
        zIndex: 70,
      }}
    >
      {/* Mask overlay */}
      <div
        className="tf-cg-mask"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--color-mask)',
          zIndex: 69,
        }}
      />
      {/* Sheet container */}
      <div
        className="tf-cg-sheet"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 360,
          height: 544,
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 70,
          overflow: 'hidden',
        }}
      >
        {/* Drag indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          />
        </div>
        {/* Header */}
        <div
          className="tf-cg-sheet-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px 12px 16px',
          }}
        >
          <span
            className="font-headline-s"
            style={{ color: 'var(--color-text-primary)' }}
          >
            编辑配单信息
          </span>
          <button
            onClick={() => {}}
            className="tf-cg-close-btn"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-bg-hover)',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="var(--color-text-secondary)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {/* Divider */}
        <div
          style={{
            height: 1,
            backgroundColor: 'var(--color-divider-subtle)',
            margin: '0 16px',
          }}
        />
        {/* Body - placeholder for children */}
        <div
          className="tf-cg-sheet-body"
          style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
          }}
        />
      </div>
    </div>
  );
}