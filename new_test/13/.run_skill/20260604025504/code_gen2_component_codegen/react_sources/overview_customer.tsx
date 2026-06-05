import React from 'react';

export default function OverviewCustomer() {
  return (
    <div
      data-component-id="overview_customer"
      style={{
        position: 'absolute',
        left: 24,
        top: 148,
        width: 312,
        height: 20,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-text-secondary)',
        }}
      >
        客户类型：中小企业
      </span>
    </div>
  );
}