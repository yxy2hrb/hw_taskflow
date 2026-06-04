import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_ov_name from './ov_name';
import Child_ov_price from './ov_price';

export default function OverviewCard() {
  return (
    <div data-component-id="overview_card" className="tf-cg-overview-card">
      <SectionLayout variant="card" title="配单概览">
        <Child_ov_name />
        <Child_ov_price />
      </SectionLayout>
    </div>
  );
}