import React from 'react';

export default function RiskWarningTip() {
  return (
    <div 
      data-component-id="risk_warning_tip"
      className="tf-cg-warning-tip"
      style={{
        position: 'absolute',
        left: '16px',
        top: '608px',
        width: '328px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        borderRadius: 'var(--radius-md)',
        boxSizing: 'border-box',
        gap: '6px'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--color-warning)' }}>
        <path d="M8 2.5L13.5 12.5H2.5L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M8 6.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="8" cy="11" r="0.8" fill="currentColor"/>
      </svg>
      <span 
        className="font-caption-m"
        style={{
          fontSize: 'var(--font-caption-12)',
          color: 'var(--color-warning)',
          lineHeight: 'var(--line-height-16)',
          fontWeight: 'var(--font-weight-regular)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        风险提示：当前方案可能缺少关键设备
      </span>
    </div>
  );
}