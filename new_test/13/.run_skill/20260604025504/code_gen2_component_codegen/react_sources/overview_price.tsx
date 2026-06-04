import React from 'react';

export default function OverviewPrice() {
  return (
    <div
      data-component-id="overview_price"
      className="tf-cg-overview-price"
      style={{
        position: 'absolute',
        left: '24px',
        top: '184px',
        width: '150px',
        height: '24px',
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
          lineHeight: '24px',
          whiteSpace: 'nowrap',
        }}
      >
        总报价：¥32,900.00
      </span>
    </div>
  );
}