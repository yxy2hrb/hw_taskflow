import React from 'react';

export default function ActionCompare() {
  return (
    <div 
      data-component-id="action_compare" 
      className="tf-cg-compare-btn"
      style={{
        left: 16,
        top: 1308,
        width: 48,
        height: 40,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7l-4 4 4 4M4 11h16M16 17l4-4-4-4M20 13H4" />
      </svg>
      <span>对比</span>
    </div>
  );
}