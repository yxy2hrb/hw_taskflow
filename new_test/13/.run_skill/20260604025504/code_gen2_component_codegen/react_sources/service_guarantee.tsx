import React from 'react';

export default function ServiceGuarantee() {
  return (
    <div
      data-component-id="service_guarantee"
      style={{
        position: 'absolute',
        left: '24px',
        top: '840px',
        width: '312px',
        height: '24px',
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
        服务保障：7x24小时技术支持
      </span>
    </div>
  );
}