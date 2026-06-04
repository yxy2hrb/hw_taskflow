import React from 'react';

export default function ConfigRiskCard() {
  return (
    <div
      data-component-id="config_risk_card"
      className="bg-white rounded-[var(--radius-lg)] flex flex-col tf-cg-risk-card"
      style={{
        position: 'absolute',
        left: 12,
        top: 256,
        width: 336,
        height: 80,
        padding: 'var(--spacing-lg)',
        gap: 'var(--spacing-lg)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-headline-s"
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-headline-16)',
            lineHeight: 'var(--line-height-20)',
            fontWeight: 'var(--font-weight-medium)'
          }}
        >
          风险提示
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
            缺少UPS、路由器等关键设备
          </span>
        </div>
        <button
          className="font-headline-xxs bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--color-primary)', padding: 0 }}
          onClick={() => {}}
        >
          去添加
        </button>
      </div>
    </div>
  );
}