import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_cfg_name from './cfg_name';
import Child_cfg_customer from './cfg_customer';
import Child_cfg_quote from './cfg_quote';
import Child_cfg_cost from './cfg_cost';

export default function ConfigOverviewCard() {
  return (
    <div data-component-id="config_overview_card" className="tf-cg-overview-card">
      <SectionLayout
        variant="card"
        title="配单概览"
        headerRightAction={
          <button
            className="tf-cg-edit-btn bg-transparent border-none cursor-pointer font-headline-xs"
            style={{ color: 'var(--color-primary)', padding: 0 }}
            onClick={() => {}}
          >
            编辑
          </button>
        }
      >
        <div className="tf-cg-overview-content flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <Child_cfg_name />
          <Child_cfg_customer />
          <Child_cfg_quote />
          <Child_cfg_cost />
        </div>
      </SectionLayout>
    </div>
  );
}