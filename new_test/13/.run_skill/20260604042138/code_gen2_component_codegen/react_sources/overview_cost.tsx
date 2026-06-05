import React from 'react';

export default function OverviewCost() {
  return (
    <div
      data-component-id="overview_cost"
      style={{
        position: 'absolute',
        left: '24px',
        top: '216px',
        width: '150px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        总成本价：¥21,999.00
      </span>
    </div>
  );
}