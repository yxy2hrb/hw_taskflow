import React from 'react';

export default function GeneratedComponent() {
  const handleClose = () => {};

  return (
    <div
      data-component-id="edit_sheet_header"
      className="tf-cg-sheet-header"
      style={{
        position: 'absolute',
        left: 0,
        top: 656,
        width: 360,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-xl)',
        backgroundColor: 'var(--color-bg-card)',
        borderTopLeftRadius: 'var(--radius-2xl)',
        borderTopRightRadius: 'var(--radius-2xl)',
        boxSizing: 'border-box',
      }}
    >
      {/* 左侧占位，保持标题居中 */}
      <div style={{ width: 40 }} />

      {/* 标题 */}
      <span
        className="font-headline-s"
        style={{ color: 'var(--color-text-primary)' }}
      >
        编辑配单信息
      </span>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          borderRadius: 'var(--radius-full)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}