import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function ToolsCard() {
  return (
    <div
      data-component-id="tools_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 888,
        width: 360,
        height: 120,
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
      }}
    >
      <SectionLayout variant="card" title="工具">
        <div style={{ minHeight: 0 }} />
      </SectionLayout>
    </div>
  );
}