import React from 'react';

export default function OverviewCustomer() {
  return (
    <div
      data-component-id="overview_customer"
      className="tf-cg-overview-customer font-body-m"
      style={{
        position: 'absolute',
        left: '24px',
        top: '148px',
        width: '312px',
        height: '20px',
        fontSize: 'var(--font-body-14)',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      客户类型：中小企业
    </div>
  );
}