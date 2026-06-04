import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_after_sales_item from './after_sales_item';

export default function AfterSalesCard() {
  return (
    <div data-component-id="after_sales_card">
      <SectionLayout variant="card" title="售后信息">
        <Child_after_sales_item />
      </SectionLayout>
    </div>
  );
}