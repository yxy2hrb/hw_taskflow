import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_risk_text from './risk_text';
import Child_risk_add from './risk_add';

export default function GeneratedComponent() {
  return (
    <div data-component-id="risk_card">
      <SectionLayout variant="card" title="风险提示">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          <Child_risk_text />
          <Child_risk_add />
        </div>
      </SectionLayout>
    </div>
  );
}