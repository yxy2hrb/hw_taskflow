import React from 'react';

export default function ProductPrice() {
  return (
    <div
      data-component-id="product_price"
      className="font-headline-s"
      style={{
        position: 'absolute',
        left: '24px',
        top: '508px',
        width: '120px',
        height: '24px',
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