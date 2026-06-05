import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="overview_card"
      className="absolute"
      style={{
        left: 12,
        top: 104,
        width: 336,
        height: 180
      }}
    >
      <SectionLayout
        variant="card"
        title="配单概览"
        headerRightAction={
          <span 
            className="font-body-m cursor-pointer" 
            style={{ color: 'var(--color-primary)' }}
          >
            编辑
          </span>
        }
      >
        <div className="flex-1" />
      </SectionLayout>
    </div>
  );
}