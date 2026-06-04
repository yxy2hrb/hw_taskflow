import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="overview_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 104,
        width: 336,
        height: 180,
      }}
    >
      <SectionLayout
        variant="card"
        title="配单概览"
        headerRightAction={
          <span className="font-body-m" style={{ color: 'var(--color-primary)' }}>
            编辑
          </span>
        }
      >
        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-disabled)', borderRadius: 'var(--radius-md)' }} />
      </SectionLayout>
    </div>
  );
}