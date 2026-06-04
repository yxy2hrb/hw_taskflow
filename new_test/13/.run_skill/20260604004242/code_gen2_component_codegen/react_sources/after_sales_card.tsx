import React from 'react';

export default function AfterSalesCard() {
  const noop = () => {};

  return (
    <div
      data-component-id="after_sales_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 716,
        width: 360,
        height: 160,
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{ padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', width: '100%', height: '100%', boxSizing: 'border-box' }}
      >
        {/* SectionTitle */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-headline-16)',
              lineHeight: 'var(--line-height-20)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            售后信息
          </span>
          <button
            onClick={noop}
            className="flex items-center bg-transparent border-none cursor-pointer"
            style={{ gap: 2 }}
          >
            <span className="font-headline-xs" style={{ color: 'var(--color-text-secondary)' }}>更多</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)' }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* After-sales content rows */}
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)', flex: 1 }}>
          <div className="flex items-center" style={{ gap: 'var(--spacing-lg)' }}>
            <div
              className="rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(16,185,129,0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)' }}>正品保障</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>华为官方授权渠道</span>
            </div>
          </div>

          <div className="flex items-center" style={{ gap: 'var(--spacing-lg)' }}>
            <div
              className="rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(59,130,246,0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)' }}>全国联保</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>支持全国服务网点维修</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}