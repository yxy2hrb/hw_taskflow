import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_ov_name from './ov_name';
import Child_ov_customer from './ov_customer';
import Child_ov_quote from './ov_quote';
import Child_ov_cost from './ov_cost';

export default function GeneratedComponent() {
  return (
    <div data-component-id="overview_card" className="tf-cg-overview-card">
      <SectionLayout
        variant="card"
        title="配单概览"
        headerRightAction={
          <button
            className="bg-transparent border-none cursor-pointer font-headline-xs"
            style={{ color: 'var(--color-primary)', padding: 0 }}
            onClick={() => {}}
          >
            编辑
          </button>
        }
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          <Child_ov_name />
          <Child_ov_customer />
          <Child_ov_quote />
          <Child_ov_cost />
        </div>
      </SectionLayout>
    </div>
  );
}