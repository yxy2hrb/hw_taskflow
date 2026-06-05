import React from 'react';

export default function ActionPurchaseConsult() {
  return (
    <div 
      data-component-id="action_purchase_consult" 
      className="tf-cg-action-btn"
      style={{
        left: '88px',
        top: '1036px',
        width: '72px',
        height: '40px'
      }}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
      <span>采购咨询</span>
    </div>
  );
}