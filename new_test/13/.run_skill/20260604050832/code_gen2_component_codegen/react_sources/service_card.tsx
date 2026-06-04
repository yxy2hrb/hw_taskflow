import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_svc_name from './svc_name';

export default function ServiceCard() {
  return (
    <div data-component-id="service_card" className="tf-cg-service-card">
      <SectionLayout variant="card" title="服务商信息">
        <Child_svc_name />
      </SectionLayout>
    </div>
  );
}