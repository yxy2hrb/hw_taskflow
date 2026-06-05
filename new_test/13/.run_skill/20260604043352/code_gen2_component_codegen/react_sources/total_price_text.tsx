import React from 'react';

export default function TotalPriceText() {
  return (
    <div
      data-component-id="total_price_text"
      className="tf-cg-total-price"
      style={{
        position: 'absolute',
        left: 16,
        top: 1300,
        width: 120,
        height: 24,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="font-headline-s"
        style={{
          fontSize: 'var(--font-headline-16)',
          lineHeight: 'var(--line-height-20)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        合计：¥21,999.00
      </span>
    </div>
  );
}