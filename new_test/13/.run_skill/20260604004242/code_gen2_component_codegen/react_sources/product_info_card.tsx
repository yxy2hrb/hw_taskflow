import React from 'react';

export default function ProductInfoCard() {
  return (
    <div
      data-component-id="product_info_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 464,
        width: 360,
        height: 240,
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{ padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', height: '100%' }}
      >
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
            产品信息
          </span>
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}