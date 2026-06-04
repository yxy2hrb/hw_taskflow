import React from 'react';

export default function OverviewName() {
  return (
    <div
      data-component-id="overview_name"
      className="font-headline-s"
      style={{
        position: 'absolute',
        left: '24px',
        top: '116px',
        width: '200px',
        height: '24px',
        fontSize: 'var(--font-headline-16)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      我的新配单
    </div>
  );
}