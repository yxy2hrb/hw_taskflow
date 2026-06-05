import React from 'react';

export default function WarningTip() {
  return (
    <div
      data-component-id="risk_warning_tip"
      className="tf-cg-warning-tip"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-warning)" style={{ flexShrink: 0 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span 
        className="font-caption-m" 
        style={{ 
          color: 'var(--color-warning)', 
          fontSize: 'var(--font-caption-12)',
          lineHeight: 'var(--line-height-16)'
        }}
      >
        风险提示：当前方案可能缺少关键设备
      </span>
    </div>
  );
}