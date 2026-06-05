import React from 'react';
export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="detail_nav_bar" 
      className="tf-cg-nav-bar"
      style={{ 
        position: 'absolute', 
        left: 0, 
        top: 36, 
        width: 360, 
        height: 44, 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 var(--spacing-xl)', 
        boxSizing: 'border-box' 
      }}
    >
      <button 
        style={{ 
          width: 24, 
          height: 40, 
          background: 'transparent', 
          border: 'none', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'var(--color-text-primary)',
          padding: 0,
          flexShrink: 0
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginLeft: -4 }}>
          <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span 
        className="font-headline-s" 
        style={{ 
          color: 'var(--color-text-primary)',
          marginLeft: 'var(--spacing-lg)'
        }}
      >
        产品详情
      </span>
    </div>
  );
}