import React from 'react';

export default function ProductPrice() {
  return (
    <div
      data-component-id="product_price"
      className="font-headline-s"
      style={{
        width: 312,
        height: 24,
        fontSize: 'var(--font-headline-16)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      ¥21,999.00
    </div>
  );
}