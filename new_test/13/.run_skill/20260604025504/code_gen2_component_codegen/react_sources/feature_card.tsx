import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function FeatureCard() {
  return (
    <div
      data-component-id="feature_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 680,
        width: 336,
        height: 160,
      }}
    >
      <SectionLayout
        variant="card"
        title="方案特色"
        headerRightAction={
          <span
            className="font-headline-xs cursor-pointer"
            style={{ color: 'var(--color-primary)' }}
            onClick={() => {}}
          >
            添加
          </span>
        }
      >
        <div className="flex flex-wrap" style={{ gap: 'var(--spacing-md)' }}>
          <span
            className="font-body-m"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            原创设计
          </span>
          <span
            className="font-body-m"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            环保材料
          </span>
          <span
            className="font-body-m"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
            }}
          >
            终身维护
          </span>
        </div>
      </SectionLayout>
    </div>
  );
}