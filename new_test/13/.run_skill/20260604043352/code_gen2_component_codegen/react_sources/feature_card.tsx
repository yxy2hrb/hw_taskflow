import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
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
          <span className="font-headline-xs" style={{ color: 'var(--color-primary)' }}>
            添加
          </span>
        }
      >
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--color-bg-disabled)',
            borderRadius: 'var(--radius-md)',
          }}
        />
      </SectionLayout>
    </div>
  );
}