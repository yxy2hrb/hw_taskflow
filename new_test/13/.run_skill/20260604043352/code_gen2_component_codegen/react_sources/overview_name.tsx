import React from 'react';

export default function OverviewName() {
  return (
    <div
      data-component-id="overview_name"
      style={{
        position: 'absolute',
        left: 24,
        top: 116,
        width: 200,
        height: 24,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="font-headline-s"
        style={{
          fontSize: 'var(--font-headline-16)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        我的新配单
      </span>
    </div>
  );
}