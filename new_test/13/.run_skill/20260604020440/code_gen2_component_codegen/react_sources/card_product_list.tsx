import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="card_product_list"
      style={{
        position: 'absolute',
        left: 12,
        top: 388,
        width: 336,
        height: 200,
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{
          padding: 'var(--spacing-lg)',
          gap: 'var(--spacing-lg)',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{ color: 'var(--color-text-primary)' }}
          >
            产品清单
          </span>
        </div>
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <span
            className="font-body-m"
            style={{
              fontSize: 'var(--font-body-14)',
              lineHeight: '22px',
              color: 'var(--color-text-primary)',
            }}
          >
            IdeaHub B2 Base-75寸 x1 ¥21,999
          </span>
        </div>
      </div>
    </div>
  );
}