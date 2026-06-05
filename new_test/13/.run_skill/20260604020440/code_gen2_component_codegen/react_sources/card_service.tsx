import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="card_service" 
      style={{ 
        position: 'absolute', 
        left: 12, 
        top: 752, 
        width: 336, 
        height: 140 
      }}
    >
      <SectionLayout variant="card" title="服务商信息">
        <div 
          className="font-body-m tf-cg-service-text" 
          style={{ 
            fontSize: 'var(--font-body-14)', 
            lineHeight: '22px', 
            color: 'var(--color-text-primary)'
          }}
        >
          服务商：华为授权服务商{'\n'}联系人：张三{'\n'}电话：13800138000
        </div>
      </SectionLayout>
    </div>
  );
}