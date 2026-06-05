import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_overview_card" style={{ position: 'absolute', left: 0, top: 92, width: 360, height: 120 }}>
      <SectionLayout variant="card" title="配单概览">
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>配单总额</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span className="font-headline-l" style={{ color: 'var(--color-primary)' }}>¥128,600</span>
            </div>
          </div>
          <div style={{ width: 1, backgroundColor: 'var(--color-divider-subtle)', alignSelf: 'stretch' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>产品数量</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span className="font-headline-l" style={{ color: 'var(--color-text-primary)' }}>12</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>项</span>
            </div>
          </div>
          <div style={{ width: 1, backgroundColor: 'var(--color-divider-subtle)', alignSelf: 'stretch' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>利润率</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span className="font-headline-l" style={{ color: 'var(--color-success)' }}>23.5</span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>%</span>
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}