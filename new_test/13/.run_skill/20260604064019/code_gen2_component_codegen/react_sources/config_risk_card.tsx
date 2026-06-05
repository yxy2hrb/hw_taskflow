import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_risk_pill from './risk_pill';
import Child_risk_msg from './risk_msg';
import Child_risk_action from './risk_action';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_risk_card" className="tf-cg-risk-card">
      <SectionLayout variant="card" title="风险提示">
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
          <Child_risk_pill />
          <Child_risk_msg />
        </div>
        <Child_risk_action />
      </SectionLayout>
    </div>
  );
}