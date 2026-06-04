import React from 'react';
import SectionLayout from '@/components/SectionLayout';

const tools = [
  { id: 'pre-sale', label: '售前工具', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )},
  { id: 'after-sale', label: '售后工具', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )},
];

export default function DetailToolsCard() {
  return (
    <div data-component-id="detail_tools_card" style={{ position: 'absolute', left: 0, top: 676, width: 360, height: 80 }}>
      <SectionLayout variant="card" title="工具">
        <div className="tf-cg-tools-row" style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          {tools.map((tool) => (
            <button
              key={tool.id}
              className="tf-cg-tool-item"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                backgroundColor: 'var(--color-bg-hover)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>
                {tool.icon}
              </div>
              <span
                className="font-body-s"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </SectionLayout>
    </div>
  );
}