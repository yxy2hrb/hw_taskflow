import React from 'react';

export default function SvcName() {
  return (
    <div
      data-component-id="svc_name"
      className="font-body-m"
      style={{
        fontSize: 'var(--font-body-14)',
        lineHeight: 'var(--line-height-20)',
        fontWeight: 'var(--font-weight-regular)',
        color: 'var(--color-text-primary)'
      }}
    >
      服务商：XX科技有限公司
    </div>
  );
}