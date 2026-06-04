import React from 'react';

export default function GeneratedComponent() {
  const items = [
    { label: '保修政策', value: '全国联保' },
    { label: '质保服务', value: '一年质保' },
    { label: '服务保障', value: '7天退换' },
  ];

  return (
    <div
      data-component-id="detail_aftersales_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 596,
        width: 336,
        height: 100,
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{ padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', width: '100%', height: '100%', boxSizing: 'border-box' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{ color: 'var(--color-text-primary)' }}
          >
            售后信息
          </span>
        </div>

        {/* Content: three info items in a row */}
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)', flex: 1 }}>
          {items.map((item, idx) => (
            <React.Fragment key={item.label}>
              <div className="flex flex-col items-center flex-1" style={{ gap: 2 }}>
                <div
                  className="rounded-[var(--radius-md)] flex items-center justify-center"
                  style={{ width: 28, height: 28, backgroundColor: 'var(--color-primary-soft)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {idx === 0 && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>}
                    {idx === 1 && <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>}
                    {idx === 2 && <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></>}
                  </svg>
                </div>
                <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
              {idx < items.length - 1 && (
                <div style={{ width: 1, height: 28, backgroundColor: 'var(--color-divider-subtle)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}