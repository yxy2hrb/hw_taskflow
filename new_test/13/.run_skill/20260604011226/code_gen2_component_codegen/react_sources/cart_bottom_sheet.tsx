import React from 'react';

export default function GeneratedComponent() {
  const noop = () => {};

  return (
    <div
      data-component-id="cart_bottom_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 412,
        width: 360,
        height: 524,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 半透明遮罩 */}
      <div
        style={{
          position: 'absolute',
          top: -412,
          left: 0,
          width: 360,
          height: 412,
          backgroundColor: 'var(--color-mask)',
        }}
      />

      {/* 底部面板 */}
      <div
        className="tf-cg-sheet"
        style={{
          width: 360,
          height: 524,
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="tf-cg-header"
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
            style={{ color: 'var(--color-text-primary)' }}
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
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-body-14)',
                fontFamily: 'HarmonyOS Sans SC, sans-serif',
                lineHeight: 'var(--line-height-18)',
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                color: 'var(--color-text-muted)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div
          className="tf-cg-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 var(--spacing-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-lg)',
          }}
        >
          {/* 风险提示 */}
          <div
            className="tf-cg-warning"
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
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <path
                d="M12 2L1 21h22L12 2z"
                stroke="var(--color-warning)"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="none"
              />
              <line x1="12" y1="9" x2="12" y2="13" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1" fill="var(--color-warning)" />
            </svg>
            <span
              className="font-body-s-multi"
              style={{ color: 'var(--color-warning)' }}
            >
              风险提示：当前方案可能缺少关键设备
            </span>
          </div>

          {/* 产品项 */}
          <div
            className="tf-cg-product"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-lg)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--color-bg-page)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {/* 产品图片占位 */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-disabled)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>

            {/* 产品信息 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <span
                className="font-headline-xxs truncate"
                style={{ color: 'var(--color-text-primary)' }}
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
                  className="font-body-s"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ×1
                </span>
              </div>
            </div>
          </div>

          {/* 推荐配件入口 */}
          <button
            onClick={noop}
            className="tf-cg-entry"
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
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                className="font-headline-xxs"
                style={{ color: 'var(--color-text-primary)' }}
              >
                推荐配件
              </span>
              <span
                className="font-caption-s"
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

        {/* ── Footer ── */}
        <div
          className="tf-cg-footer"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-lg) var(--spacing-xl) var(--spacing-xl)',
            borderTop: '1px solid var(--color-divider-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-xs)' }}>
            <span
              className="font-body-s"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              合计：
            </span>
            <span
              className="font-headline-m"
              style={{ color: 'var(--color-primary)' }}
            >
              ¥21,999
            </span>
          </div>
          <button
            onClick={noop}
            className="tf-cg-primary-btn"
            style={{
              height: 40,
              paddingLeft: 28,
              paddingRight: 28,
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-white)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: 'var(--font-headline-16)',
              fontFamily: 'HarmonyOS Sans SC, sans-serif',
              fontWeight: 'var(--font-weight-medium)',
              lineHeight: 'var(--line-height-20)',
            }}
          >
            去配单
          </button>
        </div>
      </div>
    </div>
  );
}