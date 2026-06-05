import React from 'react';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="quote_vendor_card" 
      className="tf-cg-vendor-card"
      style={{
        position: 'absolute',
        left: 16,
        top: 680,
        width: 328,
        height: 100,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-headline-xs" style={{ color: 'var(--color-text-primary)' }}>
          服务商信息
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="font-headline-xxs" style={{ color: 'var(--color-primary)' }}>华</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>华为终端有限公司</span>
          <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>官方认证服务商</span>
        </div>
      </div>
    </div>
  );
}