import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_pl_item1 from './pl_item1';
import Child_pl_item2 from './pl_item2';

export default function PlanListCard() {
  const headerRightAction = (
    <button
      className="bg-transparent border-none cursor-pointer font-headline-xs tap-opacity"
      style={{ color: 'var(--color-primary)', padding: 0 }}
      onClick={() => {}}
    >
      编辑
    </button>
  );

  return (
    <div data-component-id="plan_list_card">
      <SectionLayout
        variant="card"
        title="产品清单"
        headerRightAction={headerRightAction}
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <Child_pl_item1 />
          <Child_pl_item2 />
        </div>
      </SectionLayout>
    </div>
  );
}