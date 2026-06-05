import React from 'react';

export default function OvNameText() {
  return (
    <div
      data-component-id="ov_name"
      className="font-body-m"
      style={{
        fontSize: 'var(--font-body-14)',
        lineHeight: 'var(--line-height-20)',
        fontWeight: 'var(--font-weight-regular)',
        color: 'var(--color-text-primary)'
      }}
    >
      配单名称：XX项目配单
    </div>
  );
}