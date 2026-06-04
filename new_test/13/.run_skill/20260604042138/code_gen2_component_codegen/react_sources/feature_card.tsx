import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function FeatureCard() {
  return (
    <div 
      data-component-id="feature_card" 
      style={{
        position: 'absolute',
        left: 12,
        top: 680,
        width: 336,
        height: 160,
      }}
    >
      <SectionLayout
        variant="card"
        title="方案特色"
        headerRightAction={
          <span 
            className="font-body-m" 
            style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            添加
          </span>
        }
      >
        <div className="flex flex-wrap" style={{ gap: 'var(--spacing-md)' }}>
          <span 
            className="font-body-s" 
            style={{ 
              padding: 'var(--spacing-xs) var(--spacing-md)', 
              backgroundColor: 'var(--color-primary-soft)', 
              color: 'var(--color-primary)', 
              borderRadius: 'var(--radius-xxs)' 
            }}
          >
            免费设计
          </span>
          <span 
            className="font-body-s" 
            style={{ 
              padding: 'var(--spacing-xs) var(--spacing-md)', 
              backgroundColor: 'var(--color-primary-soft)', 
              color: 'var(--color-primary)', 
              borderRadius: 'var(--radius-xxs)' 
            }}
          >
            环保材料
          </span>
          <span 
            className="font-body-s" 
            style={{ 
              padding: 'var(--spacing-xs) var(--spacing-md)', 
              backgroundColor: 'var(--color-primary-soft)', 
              color: 'var(--color-primary)', 
              borderRadius: 'var(--radius-xxs)' 
            }}
          >
            售后保障
          </span>
        </div>
      </SectionLayout>
    </div>
  );
}