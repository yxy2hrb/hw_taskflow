import React from 'react';

export default function RiskMsg() {
  return (
    <div data-component-id="risk_msg" className="tf-cg-risk-msg">
      <span className="font-body-m" style={{ fontSize: 'var(--font-body-14)', color: 'var(--color-text-primary)' }}>
        当前方案可能缺少 UPS、路由器、防火墙等关键设备
      </span>
    </div>
  );
}