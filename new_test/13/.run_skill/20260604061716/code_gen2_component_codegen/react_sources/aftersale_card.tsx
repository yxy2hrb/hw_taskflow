import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_aftersale_warranty from './aftersale_warranty';
import Child_aftersale_service from './aftersale_service';

export default function GeneratedComponent() {
  return (
    <div data-component-id="aftersale_card" className="tf-cg-aftersale-card">
      <SectionLayout variant="card" title="售后信息">
        <Child_aftersale_warranty />
        <Child_aftersale_service />
      </SectionLayout>
    </div>
  );
}