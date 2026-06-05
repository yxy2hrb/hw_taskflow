import React from 'react';

export default function ProductPrice() {
  return (
    <div
      data-component-id="product_price"
      style={{
        position: 'absolute',
        left: 24,
        top: 508,
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
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-primary)',
        }}
      >
        ¥21,999.00
      </span>
    </div>
  );
}