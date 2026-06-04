import React from 'react';

const aftersaleItems = [
  { label: '保修政策', value: '全国联保' },
  { label: '质保服务', value: '3年整机质保' },
  { label: '服务保障', value: '7天无理由退货' },
];

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_aftersale_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 680,
        width: 336,
        height: 140,
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{ padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', width: '100%', height: '100%', boxSizing: 'border-box' }}
      >
        {/* Section Title */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{ color: 'var(--color-text-primary)' }}
          >
            售后信息
          </span>
        </div>

        {/* After-sale info lines */}
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          {aftersaleItems.map((item) => (
            <div key={item.label} className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <span
                className="font-body-m"
                style={{
                  fontSize: 'var(--font-body-14)',
                  lineHeight: '22px',
                  color: 'var(--color-text-muted)',
                  flexShrink: 0,
                }}
              >
                {item.label}：
              </span>
              <span
                className="font-body-m"
                style={{
                  fontSize: 'var(--font-body-14)',
                  lineHeight: '22px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}