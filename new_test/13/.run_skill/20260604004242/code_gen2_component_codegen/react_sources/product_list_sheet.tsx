import React from 'react';

export default function ProductListSheet() {
  const noop = () => {};

  return (
    <div
      data-component-id="product_list_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 684,
        width: 360,
        height: 560,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: 56,
          padding: '0 var(--spacing-xl)',
        }}
      >
        {/* Close button */}
        <button
          onClick={noop}
          className="flex items-center justify-center bg-transparent border-none cursor-pointer"
          style={{ width: 24, height: 24, padding: 0, color: 'var(--color-text-secondary)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <span
          className="font-headline-s"
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-headline-16)',
            lineHeight: 'var(--line-height-20)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          产品清单
        </span>

        {/* Clear all */}
        <button
          onClick={noop}
          className="bg-transparent border-none cursor-pointer"
          style={{ padding: 0 }}
        >
          <span
            className="font-body-m"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            全部清空
          </span>
        </button>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)' }} />

      {/* ── Body (scrollable) ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Warning bar */}
        <div
          className="flex items-center"
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderRadius: 'var(--radius-md)',
            gap: 'var(--spacing-md)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 2L1 21h22L12 2z" fill="var(--color-warning)" />
            <rect x="11" y="9" width="2" height="5" rx="1" fill="white" />
            <rect x="11" y="16" width="2" height="2" rx="1" fill="white" />
          </svg>
          <span
            className="font-body-s"
            style={{ color: 'var(--color-warning)' }}
          >
            风险提示：当前方案可能缺少关键设备
          </span>
        </div>

        {/* Product card */}
        <div
          className="flex items-center bg-white rounded-[var(--radius-lg)]"
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg) var(--spacing-md) var(--spacing-md)',
            gap: 'var(--spacing-lg)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Product image placeholder */}
          <div
            className="flex-shrink-0 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{ width: 64, height: 64, backgroundColor: 'var(--color-bg-disabled)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="14" rx="2" />
              <path d="M8 20h8" />
              <path d="M12 18v2" />
            </svg>
          </div>

          {/* Product info */}
          <div className="flex flex-col flex-1 min-w-0" style={{ gap: 'var(--spacing-xs)' }}>
            <span
              className="font-headline-xxs truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              IdeaHub B2 Base-75寸
            </span>
            <div className="flex items-center justify-between">
              <span
                className="font-headline-xxs"
                style={{ color: 'var(--color-primary)' }}
              >
                ¥21,999
              </span>
              <div
                className="flex items-center"
                style={{
                  gap: 'var(--spacing-md)',
                  backgroundColor: 'var(--color-bg-disabled)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 4px',
                }}
              >
                <button
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                  style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 5h6" />
                  </svg>
                </button>
                <span className="font-body-s" style={{ color: 'var(--color-text-primary)', minWidth: 12, textAlign: 'center' }}>1</span>
                <button
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                  style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 5h6" />
                    <path d="M5 2v6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended accessories entry */}
        <button
          className="flex items-center bg-white rounded-[var(--radius-lg)] border-none cursor-pointer active:scale-[0.98] transition-transform duration-150"
          style={{
            padding: 'var(--spacing-lg)',
            border: '1px solid var(--color-border-subtle)',
            gap: 'var(--spacing-lg)',
          }}
        >
          <div
            className="flex-shrink-0 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{ width: 40, height: 40, backgroundColor: 'rgba(199, 0, 11, 0.05)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0" style={{ textAlign: 'left' }}>
            <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)' }}>推荐配件</span>
            <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>查看相关配件</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Footer ── */}
      <div
        className="flex-shrink-0"
        style={{
          padding: 'var(--spacing-xl)',
          borderTop: '1px solid var(--color-divider-subtle)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>合计：</span>
          <span className="font-headline-l" style={{ color: 'var(--color-primary)' }}>¥21,999</span>
        </div>
        <button
          className="w-full flex items-center justify-center border-none rounded-[var(--radius-full)] font-headline-s tap-scale"
          style={{
            height: 40,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-white)',
            cursor: 'pointer',
          }}
        >
          去配单
        </button>
      </div>
    </div>
  );
}