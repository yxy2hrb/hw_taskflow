import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_prov_name from './prov_name';
import Child_prov_contact from './prov_contact';
import Child_prov_phone from './prov_phone';

export default function GeneratedComponent() {
  return (
    <div data-component-id="provider_card" style={{ width: '100%' }}>
      <SectionLayout variant="card" title="服务商信息">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
          <Child_prov_name />
          <Child_prov_contact />
          <Child_prov_phone />
        </div>
      </SectionLayout>
    </div>
  );
}