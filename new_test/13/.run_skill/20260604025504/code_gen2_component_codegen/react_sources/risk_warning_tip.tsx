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
        borderRadius: 'var(--radius-xxs)',
        boxSizing: 'border-box',
        gap: '8px'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5ZM0.5 8C0.5 3.85786 3.85786 0.5 8 0.5C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8Z" fill="var(--color-warning)"/>
        <path d="M8 4.5C8.27614 4.5 8.5 4.72386 8.5 5V8.5C8.5 8.77614 8.27614 9 8 9C7.72386 9 7.5 8.77614 7.5 8.5V5C7.5 4.72386 7.72386 4.5 8 4.5Z" fill="var(--color-warning)"/>
        <path d="M8 11.5C8.27614 11.5 8.5 11.2761 8.5 11C8.5 10.7239 8.27614 10.5 8 10.5C7.72386 10.5 7.5 10.7239 7.5 11C7.5 11.2761 7.72386 11.5 8 11.5Z" fill="var(--color-warning)"/>
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