import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_risk_text from './risk_text';
import Child_risk_btn from './risk_btn';

export default function RiskCard() {
  return (
    <div data-component-id="risk_card">
      <SectionLayout variant="card" title="风险提示">
        <div className="flex items-center justify-between">
          <Child_risk_text />
          <Child_risk_btn />
        </div>
      </SectionLayout>
    </div>
  );
}