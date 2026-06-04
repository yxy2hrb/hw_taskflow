import React from 'react';

export default function ConfigServiceCard() {
  return (
    <div
      data-component-id="config_service_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 752,
        width: 360,
        height: 120,
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{ padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', width: '100%', height: '100%', boxSizing: 'border-box' }}
      >
        {/* SectionTitle */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-headline-16)',
              lineHeight: 'var(--line-height-20)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            服务商信息
          </span>
        </div>
        {/* Content area placeholder */}
        <div className="flex-1" />
      </div>
    </div>
  );
}