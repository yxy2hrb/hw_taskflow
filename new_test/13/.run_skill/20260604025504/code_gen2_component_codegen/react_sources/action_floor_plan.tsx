import React from 'react';

export default function ActionFloorPlan() {
  return (
    <div 
      data-component-id="action_floor_plan" 
      className="tf-cg-icon-text-btn"
      style={{
        position: 'absolute',
        left: '16px',
        top: '1036px',
        width: '64px',
        height: '40px'
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span className="font-caption-m" style={{ color: 'var(--color-text-primary)', lineHeight: '14px' }}>点位图</span>
    </div>
  );
}