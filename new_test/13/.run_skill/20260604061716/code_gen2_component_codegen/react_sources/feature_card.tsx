import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_feat_text from './feat_text';

export default function GeneratedComponent() {
  return (
    <div data-component-id="feature_card">
      <SectionLayout
        variant="card"
        title="方案特色"
        headerRightAction={
          <button
            className="tf-cg-text-btn font-headline-xs"
            onClick={() => {}}
          >
            添加
          </button>
        }
      >
        <Child_feat_text />
      </SectionLayout>
    </div>
  );
}