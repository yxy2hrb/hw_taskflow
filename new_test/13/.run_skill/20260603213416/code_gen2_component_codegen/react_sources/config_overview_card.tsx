import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import { TextButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_overview_card" style={{ position: 'absolute', left: 0, top: 92, width: 360, height: 160 }}>
      <div style={{ padding: '0 var(--spacing-xl)' }}>
        <SectionLayout
          variant="card"
          title="配单概览"
          headerRightAction={
            <TextButton size="small" variant="primary" onClick={() => {}}>
              编辑
            </TextButton>
          }
        >
          <div className="tf-cg-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg) var(--spacing-xl)' }}>
            <div className="tf-cg-field">
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>配单名称</span>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)', marginTop: 'var(--spacing-xs)', display: 'block' }}>智慧园区解决方案</span>
            </div>
            <div className="tf-cg-field">
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>客户类型</span>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)', marginTop: 'var(--spacing-xs)', display: 'block' }}>企业客户</span>
            </div>
            <div className="tf-cg-field">
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>总报价</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 'var(--spacing-xs)' }}>
                <span className="font-headline-s" style={{ color: 'var(--color-primary)' }}>¥128,000</span>
              </div>
            </div>
            <div className="tf-cg-field">
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>总成本价</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 'var(--spacing-xs)' }}>
                <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>¥96,500</span>
              </div>
            </div>
          </div>
        </SectionLayout>
      </div>
    </div>
  );
}