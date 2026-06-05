import React from 'react';

export default function RiskText() {
  return (
    <div
      data-component-id="risk_text"
      className="font-body-m"
      style={{
        position: 'absolute',
        left: 24,
        top: 308,
        width: 220,
        minHeight: 40,
        color: 'var(--color-warning)',
      }}
    >
      当前方案可能缺少 UPS、路由器、防火墙等关键设备
    </div>
  );
}