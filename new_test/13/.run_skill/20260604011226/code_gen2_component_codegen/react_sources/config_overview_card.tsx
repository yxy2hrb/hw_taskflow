import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_overview_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 104,
        width: 336,
        height: 160,
        zIndex: 10
      }}
    >
      <SectionLayout variant="card" title="配单概览">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-lg)',
            marginTop: 'var(--spacing-xs)'
          }}
        >
          <div className="flex flex-col">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>配单总额</span>
            <span className="font-headline-m" style={{ color: 'var(--color-primary)', marginTop: 4 }}>¥ 128,000</span>
          </div>
          <div className="flex flex-col">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>产品数量</span>
            <span className="font-headline-m" style={{ color: 'var(--color-text-primary)', marginTop: 4 }}>12 件</span>
          </div>
          <div className="flex flex-col">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>预计利润</span>
            <span className="font-headline-m" style={{ color: 'var(--color-success)', marginTop: 4 }}>¥ 25,600</span>
          </div>
          <div className="flex flex-col">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>折扣率</span>
            <span className="font-headline-m" style={{ color: 'var(--color-text-primary)', marginTop: 4 }}>8.5 折</span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}