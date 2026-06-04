import React from 'react';
export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="quote_overview_card" 
      className="tf-cg-quote-overview-card"
      style={{
        position: 'absolute',
        left: 16,
        top: 96,
        width: 328,
        height: 120,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--spacing-xl)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <span className="font-headline-xs" style={{ color: 'var(--color-text-primary)' }}>
        配单概览
      </span>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>配单总额</span>
          <span className="font-headline-s" style={{ color: 'var(--color-primary)' }}>¥128,000</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>产品数量</span>
          <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>12</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>预计利润</span>
          <span className="font-headline-s" style={{ color: 'var(--color-success)' }}>¥25,600</span>
        </div>
      </div>
    </div>
  );
}