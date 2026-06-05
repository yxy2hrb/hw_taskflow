import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_tool_1 from './tool_1';
import Child_tool_2 from './tool_2';

export default function GeneratedComponent() {
  return (
    <div data-component-id="tools_card">
      <SectionLayout variant="card" title="售前/售后工具">
        <div className="flex" style={{ gap: 'var(--spacing-lg)' }}>
          <div className="flex-1">
            <Child_tool_1 />
          </div>
          <div className="flex-1">
            <Child_tool_2 />
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}