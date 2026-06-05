import React from 'react';

export default function RiskText() {
  return (
    <div
      data-component-id="risk_text"
      style={{
        position: 'absolute',
        left: 24,
        top: 308,
        width: 220,
        height: 40,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-warning)',
        }}
      >
        当前方案可能缺少 UPS、路由器、防火墙等关键设备
      </span>
    </div>
  );
}