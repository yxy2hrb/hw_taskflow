import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_feature_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 600,
        width: 336,
        height: 140,
      }}
    >
      <SectionLayout
        variant="card"
        title="方案特色"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
            <div
              className="rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(199, 0, 11, 0.05)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)' }}>全屋智能方案</span>
              <span className="font-caption-s" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>一站式智能家居解决方案</span>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
            <div
              className="rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
              <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)' }}>品质保障</span>
              <span className="font-caption-s" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>华为官方认证产品</span>
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}