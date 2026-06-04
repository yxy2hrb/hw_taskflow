import React from 'react';

export default function BottomActionBar() {
  return (
    <div
      data-component-id="detail_bottom_bar"
      className="tf-cg-bottom-bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 1136,
        width: 360,
        height: 64,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        zIndex: 100,
        boxSizing: 'border-box'
      }}
    >
      <div className="tf-cg-left-actions">
        <div className="tf-cg-action-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>产品对比</span>
        </div>
        <div className="tf-cg-action-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>咨询</span>
        </div>
      </div>

      <div className="tf-cg-right-buttons">
        <button className="tf-cg-btn-secondary">加入采购单</button>
        <button className="tf-cg-btn-primary">加入配单</button>
      </div>
    </div>
  );
}