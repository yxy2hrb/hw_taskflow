import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_product_list_card"
      className="tf-cg-product-list-card"
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
          width: '100%',
          height: '100%',
          padding: 'var(--spacing-lg)',
          gap: 'var(--spacing-lg)',
          boxSizing: 'border-box',
        }}
      >
        {/* Section Title */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{ color: 'var(--color-text-primary)' }}
          >
            产品清单
          </span>
        </div>

        {/* Content area placeholder */}
        <div className="flex-1 flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <div
            className="rounded-[var(--radius-md)]"
            style={{
              height: 46,
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          />
          <div
            className="rounded-[var(--radius-md)]"
            style={{
              height: 46,
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          />
        </div>
      </div>
    </div>
  );
}