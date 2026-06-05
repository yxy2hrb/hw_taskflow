import React from 'react';

export default function ProviderContact() {
  return (
    <div
      data-component-id="provider_contact"
      className="tf-cg-provider-contact"
      style={{
        position: 'absolute',
        left: 24,
        top: 896,
        width: 312,
        height: 20,
      }}
    >
      <span
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-text-secondary)',
          lineHeight: '20px',
        }}
      >
        联系人：张三 | 电话：13800138000
      </span>
    </div>
  );
}