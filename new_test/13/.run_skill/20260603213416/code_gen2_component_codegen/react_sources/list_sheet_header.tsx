import React from 'react';

export default function GeneratedComponent() {
  const handleClose = () => {};
  const handleClear = () => {};

  return (
    <div
      data-component-id="list_sheet_header"
      className="tf-cg-sheet-header"
      style={{
        position: 'absolute',
        left: 0,
        top: 376,
        width: 360,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
        boxSizing: 'border-box',
      }}
    >
      {/* 左侧：全部清空 */}
      <button
        onClick={handleClear}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: 'var(--font-body-14)',
          fontFamily: "'HarmonyOS Sans SC', sans-serif",
          fontWeight: 'var(--font-weight-regular)',
          lineHeight: 'var(--line-height-18)',
          color: 'var(--color-text-secondary)',
          minWidth: 56,
          textAlign: 'left',
        }}
      >
        全部清空
      </button>

      {/* 中间：标题 */}
      <span
        style={{
          fontSize: 'var(--font-headline-16)',
          fontFamily: "'HarmonyOS Sans SC', sans-serif",
          fontWeight: 'var(--font-weight-medium)',
          lineHeight: 'var(--line-height-20)',
          color: 'var(--color-text-primary)',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        产品清单
      </span>

      {/* 右侧：关闭按钮 */}
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 56,
          justifyContent: 'flex-end',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{ display: 'block' }}
        >
          <path
            d="M5 5L15 15M15 5L5 15"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}