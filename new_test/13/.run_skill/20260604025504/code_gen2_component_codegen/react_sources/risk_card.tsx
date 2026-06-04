import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function RiskCard() {
  return (
    <div
      data-component-id="risk_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 296,
        width: 336,
        height: 120,
      }}
    >
      <SectionLayout variant="card" title="风险提示">
        <div className="flex items-center justify-center" style={{ flex: 1, color: 'var(--color-text-muted)' }}>
          <span className="font-body-m">暂无风险提示</span>
        </div>
      </SectionLayout>
    </div>
  );
}