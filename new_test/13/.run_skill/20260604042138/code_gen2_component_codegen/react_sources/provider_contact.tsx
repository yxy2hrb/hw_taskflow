import React from 'react';

export default function ProviderContact() {
  return (
    <div
      data-component-id="provider_contact"
      className="tf-cg-provider-contact font-body-m"
      style={{
        position: 'absolute',
        left: '24px',
        top: '896px',
        width: '312px',
        height: '20px',
        fontSize: 'var(--font-body-14)',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      联系人：张三 | 电话：13800138000
    </div>
  );
}