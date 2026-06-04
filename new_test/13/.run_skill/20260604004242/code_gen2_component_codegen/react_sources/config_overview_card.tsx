import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function ConfigOverviewCard() {
  return (
    <div
      data-component-id="config_overview_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 104,
        width: 360,
        height: 160,
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
      }}
    >
      <SectionLayout
        variant="card"
        title="配单概览"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>方案名称</span>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>智慧办公空间方案</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>产品数量</span>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>12 件</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>预估总价</span>
            <span className="font-headline-s" style={{ color: 'var(--color-primary)' }}>¥128,600</span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}