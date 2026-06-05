import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_feat_text from './feat_text';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_feature_card">
      <SectionLayout
        variant="card"
        title="方案特色"
        headerRightAction={
          <span 
            className="font-headline-xs" 
            style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            添加
          </span>
        }
      >
        <Child_feat_text />
      </SectionLayout>
    </div>
  );
}