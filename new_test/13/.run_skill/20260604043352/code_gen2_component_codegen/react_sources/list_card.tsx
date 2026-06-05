import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="list_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 428,
        width: 336,
        height: 240,
      }}
    >
      <SectionLayout
        variant="card"
        title="产品清单"
        headerRightAction={
          <span
            className="font-body-m"
            style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            编辑
          </span>
        }
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
          }}
        >
          <div
            style={{
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          />
          <div
            style={{
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          />
          <div
            style={{
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-disabled)',
            }}
          />
        </div>
      </SectionLayout>
    </div>
  );
}