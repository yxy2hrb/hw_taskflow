import React from 'react';

export default function ProductListSheet() {
  const noop = () => {};

  return (
    <div
      data-component-id="product_list_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 374,
        width: 360,
        height: 562,
        zIndex: 60,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-xl) var(--spacing-xl) var(--spacing-lg)',
          flexShrink: 0,
        }}
      >
        <span
          className="font-headline-s"
          style={{
            fontSize: 'var(--font-headline-16)',
            lineHeight: 'var(--line-height-20)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
          }}
        >
          产品清单
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
          <button
            onClick={noop}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'var(--font-body-14)',
              lineHeight: 'var(--line-height-20)',
              fontWeight: 'var(--font-weight-regular)',
              color: 'var(--color-text-secondary)',
            }}
          >
            全部清空
          </button>
          <button
            onClick={noop}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)', flexShrink: 0 }} />

      {/* ── Body (scrollable) ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Warning Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path
              d="M12 2L1 21h22L12 2z"
              stroke="var(--color-warning)"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1="12" y1="9" x2="12" y2="14" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="var(--color-warning)" />
          </svg>
          <span
            className="font-body-m"
            style={{
              fontSize: 'var(--font-body-14)',
              lineHeight: 'var(--line-height-20)',
              fontWeight: 'var(--font-weight-regular)',
              color: 'var(--color-warning)',
            }}
          >
            风险提示：当前方案可能缺少关键设备
          </span>
        </div>

        {/* Product Item */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-bg-page)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* Product Image Placeholder */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          {/* Product Info */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span
              className="font-headline-xs truncate"
              style={{
                color: 'var(--color-text-primary)',
              }}
            >
              IdeaHub B2 Base-75寸
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                className="font-headline-xs"
                style={{ color: 'var(--color-primary)' }}
              >
                ¥21,999
              </span>
              <span
                className="font-caption-m"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ×1
              </span>
            </div>
          </div>
        </div>

        {/* Recommended Accessories Entry */}
        <button
          onClick={noop}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-bg-page)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span
              className="font-headline-xs"
              style={{ color: 'var(--color-text-primary)' }}
            >
              推荐配件
            </span>
            <span
              className="font-caption-m"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              查看相关配件
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)', flexShrink: 0 }} />

      {/* ── Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-xs)' }}>
          <span
            className="font-body-m"
            style={{
              fontSize: 'var(--font-body-14)',
              lineHeight: 'var(--line-height-20)',
              color: 'var(--color-text-secondary)',
            }}
          >
            合计：
          </span>
          <span
            className="font-headline-m"
            style={{
              color: 'var(--color-primary)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            ¥21,999
          </span>
        </div>
        <button
          onClick={noop}
          className="font-headline-s"
          style={{
            fontSize: 'var(--font-headline-16)',
            lineHeight: 'var(--line-height-20)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-white)',
            backgroundColor: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            height: 40,
            paddingLeft: 28,
            paddingRight: 28,
            cursor: 'pointer',
          }}
        >
          去配单
        </button>
      </div>
    </div>
  );
}