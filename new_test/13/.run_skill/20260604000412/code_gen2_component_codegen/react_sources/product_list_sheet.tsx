import React from 'react';

export default function ProductListSheet() {
  const noop = () => {};

  return (
    <div
      data-component-id="product_list_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 472,
        width: 360,
        height: 708,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      {/* ── 拖拽指示条 ── */}
      <div className="flex items-center justify-center" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <div style={{ width: 36, height: 4, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg-disabled)' }} />
      </div>

      {/* ── 头部：标题 + 全部清空 + 关闭 ── */}
      <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-md) var(--spacing-xl)', flexShrink: 0 }}>
        <span
          className="font-headline-m"
          style={{
            fontSize: 'var(--font-headline-18)',
            lineHeight: 'var(--line-height-24)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
          }}
        >
          产品清单
        </span>
        <div className="flex items-center" style={{ gap: 'var(--spacing-lg)' }}>
          <button
            onClick={noop}
            className="bg-transparent border-none cursor-pointer"
            style={{ padding: 0 }}
          >
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>全部清空</span>
          </button>
          <button
            onClick={noop}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ width: 24, height: 24, padding: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 分割线 ── */}
      <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)', margin: '0 var(--spacing-xl)' }} />

      {/* ── 内容区（可滚动） ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>

        {/* ── 风险提示 ── */}
        <div
          className="flex items-start"
          style={{
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(249, 115, 22, 0.06)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 2L1 21h22L12 2z" stroke="var(--color-warning)" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
            <line x1="12" y1="9" x2="12" y2="14" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="var(--color-warning)" />
          </svg>
          <span className="font-body-s-multi" style={{ color: 'var(--color-warning)', flex: 1 }}>
            风险提示：当前方案可能缺少关键设备
          </span>
        </div>

        {/* ── 已选产品 ── */}
        <div
          className="flex items-center"
          style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-bg-page)',
            borderRadius: 'var(--radius-md)',
            gap: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          {/* 产品图片占位 */}
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="14" rx="2" />
              <line x1="8" y1="20" x2="16" y2="20" />
              <line x1="12" y1="18" x2="12" y2="20" />
            </svg>
          </div>

          {/* 产品信息 */}
          <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
            <span className="font-headline-xxs truncate" style={{ color: 'var(--color-text-primary)' }}>
              IdeaHub B2 Base-75寸
            </span>
            <div className="flex items-center justify-between">
              <span className="font-headline-xs" style={{ color: 'var(--color-primary)' }}>¥21,999</span>
              <div
                className="flex items-center justify-center"
                style={{
                  gap: 'var(--spacing-md)',
                  backgroundColor: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 4px',
                }}
              >
                <button
                  onClick={noop}
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                  style={{ width: 20, height: 20, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg-disabled)', padding: 0 }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <line x1="2" y1="5" x2="8" y2="5" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="font-body-s" style={{ color: 'var(--color-text-primary)', minWidth: 12, textAlign: 'center' }}>1</span>
                <button
                  onClick={noop}
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                  style={{ width: 20, height: 20, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-primary)', padding: 0 }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <line x1="2" y1="5" x2="8" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="5" y1="2" x2="5" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 推荐配件入口 ── */}
        <button
          onClick={noop}
          className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer"
          style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-bg-page)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div className="flex flex-col items-start" style={{ gap: 2 }}>
            <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)' }}>推荐配件</span>
            <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>查看相关配件</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── 底部操作栏 ── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          borderTop: '1px solid var(--color-divider-subtle)',
        }}
      >
        <div className="flex items-baseline" style={{ gap: 2 }}>
          <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>合计：</span>
          <span className="font-headline-l" style={{ color: 'var(--color-primary)' }}>¥21,999</span>
        </div>
        <button
          onClick={noop}
          className="inline-flex items-center justify-center border-none rounded-[var(--radius-full)] cursor-pointer font-headline-s"
          style={{
            height: 40,
            paddingLeft: 28,
            paddingRight: 28,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-white)',
          }}
        >
          去配单
        </button>
      </div>
    </div>
  );
}