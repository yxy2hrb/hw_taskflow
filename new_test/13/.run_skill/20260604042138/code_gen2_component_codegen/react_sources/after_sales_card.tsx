import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function AfterSalesCard() {
  return (
    <div 
      data-component-id="after_sales_card" 
      style={{
        position: 'absolute',
        left: 12,
        top: 776,
        width: 336,
        height: 160,
      }}
    >
      <SectionLayout variant="card" title="售后信息">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
            <div 
              className="rounded-[var(--radius-xxs)]" 
              style={{ 
                width: 4, 
                height: 4, 
                backgroundColor: 'var(--color-primary)' 
              }} 
            />
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>
              支持7天无理由退货
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
            <div 
              className="rounded-[var(--radius-xxs)]" 
              style={{ 
                width: 4, 
                height: 4, 
                backgroundColor: 'var(--color-primary)' 
              }} 
            />
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>
              正品保证，品牌直供
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
            <div 
              className="rounded-[var(--radius-xxs)]" 
              style={{ 
                width: 4, 
                height: 4, 
                backgroundColor: 'var(--color-primary)' 
              }} 
            />
            <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>
              全国联保，售后无忧
            </span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}