import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="sheet_plan"
      className="tf-cg-bottomsheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 468,
        width: 360,
        height: 700,
        zIndex: 60,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}
    >
      {/* 顶部拖拽指示条 */}
      <div className="tf-cg-bottomsheet__handle-wrap">
        <div className="tf-cg-bottomsheet__handle" />
      </div>

      {/* 头部：关闭 + 标题 + 全部清空 */}
      <div className="tf-cg-bottomsheet__header">
        <button
          className="tf-cg-bottomsheet__close-btn"
          onClick={() => {}}
          aria-label="关闭"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        <span className="tf-cg-bottomsheet__title font-headline-s">
          产品清单
        </span>

        <button
          className="tf-cg-bottomsheet__clear-btn"
          onClick={() => {}}
        >
          <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>
            全部清空
          </span>
        </button>
      </div>

      {/* 分割线 */}
      <div className="tf-cg-bottomsheet__divider" />

      {/* 内容区域 — 留给子组件渲染 */}
      <div className="tf-cg-bottomsheet__body">
      </div>
    </div>
  );
}