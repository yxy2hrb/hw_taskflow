import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function ConfigRiskCard() {
  const noop = () => {};

  return (
    <div
      data-component-id="config_risk_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 276,
        width: 360,
        height: 120,
      }}
    >
      <SectionLayout
        variant="card"
        title="风险提示"
        onMore={noop}
        moreText="更多"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-warning)',
                marginTop: 7,
                flexShrink: 0,
              }}
            />
            <span
              className="font-body-m-multi"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              部分产品库存不足，建议提前确认供货周期
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-error)',
                marginTop: 7,
                flexShrink: 0,
              }}
            />
            <span
              className="font-body-m-multi"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              客户预算超出15%，需调整方案配置
            </span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}