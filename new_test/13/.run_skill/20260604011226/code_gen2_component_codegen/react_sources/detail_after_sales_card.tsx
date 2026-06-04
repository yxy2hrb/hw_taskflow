import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_after_sales_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 676,
        width: 336,
        height: 140,
      }}
    >
      <SectionLayout variant="card" title="售后信息">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div className="flex-between">
            <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>保修期</span>
            <span className="font-body-s" style={{ color: 'var(--color-text-primary)' }}>一年质保</span>
          </div>
          <div className="flex-between">
            <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>退换货</span>
            <span className="font-body-s" style={{ color: 'var(--color-text-primary)' }}>7天无理由退换</span>
          </div>
          <div className="flex-between">
            <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>维修服务</span>
            <span className="font-body-s" style={{ color: 'var(--color-text-primary)' }}>全国联保</span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}