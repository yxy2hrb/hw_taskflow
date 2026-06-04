import React from 'react';

export default function ServiceGuaranteeText() {
  return (
    <div
      data-component-id="service_guarantee"
      className="font-body-m"
      style={{
        position: 'absolute',
        left: '24px',
        top: '840px',
        width: '312px',
        height: '24px',
        fontSize: 'var(--font-body-14)',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}
    >
      服务保障：7x24小时技术支持
    </div>
  );
}