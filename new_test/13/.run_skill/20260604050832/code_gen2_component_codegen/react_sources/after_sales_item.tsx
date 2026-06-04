import React from 'react';

export default function AfterSalesItem() {
  return (
    <div data-component-id="after_sales_item">
      <span
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          lineHeight: 'var(--line-height-20)',
          fontWeight: 'var(--font-weight-regular)',
          color: 'var(--color-text-secondary)',
        }}
      >
        保修政策：3年质保，提供上门服务
      </span>
    </div>
  );
}