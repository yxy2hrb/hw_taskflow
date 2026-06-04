import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="provider_card" 
      className="absolute" 
      style={{ left: 12, top: 852, width: 336, height: 160 }}
    >
      <SectionLayout variant="card" title="服务商信息">
        <div className="flex items-center" style={{ gap: 'var(--spacing-lg)' }}>
          <div 
            className="size-icon-card rounded-[var(--radius-md)] flex items-center justify-center" 
            style={{ backgroundColor: 'var(--color-primary-soft)' }}
          >
            <span className="font-headline-m" style={{ color: 'var(--color-primary)' }}>企</span>
          </div>
          <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
            <span className="font-headline-xs truncate" style={{ color: 'var(--color-text-primary)' }}>
              匠心家装设计工作室
            </span>
            <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
                金牌认证
              </span>
              <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
                5年质保
              </span>
            </div>
          </div>
          <button 
            className="flex items-center justify-center rounded-[var(--radius-full)] tap-scale" 
            style={{ 
              width: 64, 
              height: 32, 
              backgroundColor: 'var(--color-primary)',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => {}}
          >
            <span className="font-headline-xxs text-white">联系</span>
          </button>
        </div>
      </SectionLayout>
    </div>
  );
}