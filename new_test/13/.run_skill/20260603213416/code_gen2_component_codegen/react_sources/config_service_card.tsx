import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_service_card" style={{ position: 'absolute', left: 0, top: 740, width: 360 }}>
      <div style={{ padding: '0 var(--spacing-xl)' }}>
        <SectionLayout variant="card" title="服务商信息">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>服务商名称</span>
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>华为技术有限公司</span>
            </div>
            <div style={{ height: 1, backgroundColor: 'var(--color-divider-faint)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>联系人</span>
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>张经理</span>
            </div>
            <div style={{ height: 1, backgroundColor: 'var(--color-divider-faint)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>联系电话</span>
              <span className="font-body-m" style={{ color: 'var(--color-primary)' }}>138-0000-0000</span>
            </div>
          </div>
        </SectionLayout>
      </div>
    </div>
  );
}