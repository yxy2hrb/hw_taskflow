import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function ConfigFeatureCard() {
  return (
    <div
      data-component-id="config_feature_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 620,
        width: 360,
        height: 120,
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
      }}
    >
      <SectionLayout
        variant="card"
        title="方案特色"
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <span
            className="font-caption-m rounded-[var(--radius-full)]"
            style={{
              padding: '4px 12px',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            全屋智能
          </span>
          <span
            className="font-caption-m rounded-[var(--radius-full)]"
            style={{
              padding: '4px 12px',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            场景联动
          </span>
          <span
            className="font-caption-m rounded-[var(--radius-full)]"
            style={{
              padding: '4px 12px',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            远程控制
          </span>
        </div>
      </SectionLayout>
    </div>
  );
}