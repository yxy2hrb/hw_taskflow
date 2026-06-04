import React from 'react';

export default function GeneratedComponent() {
  const noop = () => {};

  return (
    <div
      data-component-id="list_sheet"
      className="tf-cg-sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 376,
        width: 360,
        height: 560,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 拖拽指示条 */}
      <div className="flex items-center justify-center" style={{ paddingTop: 'var(--spacing-md)', paddingBottom: 'var(--spacing-xs)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg-disabled)' }} />
      </div>

      {/* 标题栏 */}
      <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-md) var(--spacing-xl)', flexShrink: 0 }}>
        <span className="font-headline-l" style={{ color: 'var(--color-text-primary)' }}>产品清单</span>
        <button
          onClick={noop}
          className="flex items-center justify-center bg-transparent border-none cursor-pointer"
          style={{ width: 32, height: 32, color: 'var(--color-text-muted)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 分割线 */}
      <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)', margin: '0 var(--spacing-xl)' }} />

      {/* 可滚动内容区 */}
      <div className="tf-cg-sheet-body" style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
        {/* 风险提示 */}
        <div className="tf-cg-risk-card" style={{
          backgroundColor: 'rgba(249, 115, 22, 0.06)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-md)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 2L2 20h20L12 2z" stroke="var(--color-warning)" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16.5" r="1" fill="var(--color-warning)"/>
          </svg>
          <div className="flex flex-col" style={{ gap: 2 }}>
            <span className="font-headline-xxs" style={{ color: 'var(--color-warning)' }}>风险提示</span>
            <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)', lineHeight: '18px' }}>部分产品库存不足，建议尽快确认配单方案</span>
          </div>
        </div>

        {/* 已选产品 */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <span className="font-headline-xs" style={{ color: 'var(--color-text-primary)' }}>已选产品</span>
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>3件</span>
          </div>

          {/* 产品项 1 */}
          <div className="tf-cg-product-item" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-md) 0',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-disabled)" strokeWidth="1.4">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
              <span className="font-headline-xxs truncate" style={{ color: 'var(--color-text-primary)' }}>华为 MatePad Pro 12.6"</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>¥4,999 × 1</span>
            </div>
            <span className="font-headline-xxs" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>¥4,999</span>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-divider-faint)', marginLeft: 60 }} />

          {/* 产品项 2 */}
          <div className="tf-cg-product-item" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-md) 0',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-disabled)" strokeWidth="1.4">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
              <span className="font-headline-xxs truncate" style={{ color: 'var(--color-text-primary)' }}>华为 M-Pencil 手写笔</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>¥599 × 1</span>
            </div>
            <span className="font-headline-xxs" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>¥599</span>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--color-divider-faint)', marginLeft: 60 }} />

          {/* 产品项 3 */}
          <div className="tf-cg-product-item" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-md) 0',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-disabled)" strokeWidth="1.4">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
              <span className="font-headline-xxs truncate" style={{ color: 'var(--color-text-primary)' }}>智能磁吸键盘</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>¥1,299 × 1</span>
            </div>
            <span className="font-headline-xxs" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>¥1,299</span>
          </div>
        </div>

        {/* 推荐配件 */}
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <span className="font-headline-xs" style={{ color: 'var(--color-text-primary)' }}>推荐配件</span>
            <button className="flex items-center bg-transparent border-none cursor-pointer" style={{ gap: 2 }}>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-secondary)' }}>更多</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="flex" style={{ gap: 'var(--spacing-md)', overflowX: 'auto' }}>
            {/* 配件卡片 1 */}
            <div className="tf-cg-accessory-card" style={{
              width: 120,
              flexShrink: 0,
              backgroundColor: 'var(--color-bg-page)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.4">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <line x1="12" y1="18" x2="12" y2="18"/>
                </svg>
              </div>
              <span className="font-caption-m text-center truncate w-full" style={{ color: 'var(--color-text-primary)' }}>保护壳</span>
              <span className="font-caption-s" style={{ color: 'var(--color-primary)' }}>¥199</span>
            </div>

            {/* 配件卡片 2 */}
            <div className="tf-cg-accessory-card" style={{
              width: 120,
              flexShrink: 0,
              backgroundColor: 'var(--color-bg-page)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.4">
                  <rect x="2" y="7" width="20" height="10" rx="2"/>
                  <line x1="6" y1="12" x2="6" y2="12"/>
                  <line x1="18" y1="12" x2="18" y2="12"/>
                </svg>
              </div>
              <span className="font-caption-m text-center truncate w-full" style={{ color: 'var(--color-text-primary)' }}>扩展坞</span>
              <span className="font-caption-s" style={{ color: 'var(--color-primary)' }}>¥399</span>
            </div>

            {/* 配件卡片 3 */}
            <div className="tf-cg-accessory-card" style={{
              width: 120,
              flexShrink: 0,
              backgroundColor: 'var(--color-bg-page)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.4">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  <path d="M8 12l3 3 5-5"/>
                </svg>
              </div>
              <span className="font-caption-m text-center truncate w-full" style={{ color: 'var(--color-text-primary)' }}>屏幕膜</span>
              <span className="font-caption-s" style={{ color: 'var(--color-primary)' }}>¥99</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div style={{
        flexShrink: 0,
        padding: 'var(--spacing-lg) var(--spacing-xl)',
        borderTop: '1px solid var(--color-divider-subtle)',
        backgroundColor: 'var(--color-bg-card)',
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>合计</span>
          <div className="flex items-baseline" style={{ gap: 2 }}>
            <span className="font-headline-xxl" style={{ color: 'var(--color-primary)' }}>¥6,897</span>
          </div>
        </div>
        <button
          onClick={noop}
          className="tf-cg-submit-btn w-full flex items-center justify-center border-none cursor-pointer tap-scale"
          style={{
            height: 44,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-white)',
          }}
        >
          <span className="font-headline-s">去配单</span>
        </button>
      </div>
    </div>
  );
}