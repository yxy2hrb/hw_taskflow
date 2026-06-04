import React from 'react';

export default function PInfoPrice() {
  return (
    <div
      data-component-id="p_info_price"
      className="font-headline-s"
      style={{
        fontSize: 'var(--font-headline-16)',
        lineHeight: 'var(--line-height-20)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-primary)'
      }}
    >
      ¥21,999.00
    </div>
  );
}