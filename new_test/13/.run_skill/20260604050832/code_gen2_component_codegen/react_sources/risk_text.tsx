import React from 'react';

export default function RiskText() {
  return (
    <span
      data-component-id="risk_text"
      className="font-body-m"
      style={{
        fontSize: 'var(--font-body-14)',
        lineHeight: 'var(--line-height-20)',
        fontWeight: 'var(--font-weight-regular)',
        color: 'var(--color-warning)'
      }}
    >
      缺少关键设备：UPS、路由器
    </span>
  );
}