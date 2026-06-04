import React from 'react';

export default function ServiceGuaranteeText() {
  return (
    <div
      data-component-id="service_guarantee"
      style={{
        position: 'absolute',
        left: 24,
        top: 840,
        width: 312,
        height: 24,
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