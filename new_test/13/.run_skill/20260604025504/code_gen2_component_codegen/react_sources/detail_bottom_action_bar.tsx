import React from 'react';

export default function BottomActionBar() {
  return (
    <div 
      data-component-id="detail_bottom_action_bar" 
      className="tf-cg-bottom-bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 1296,
        width: 360,
        height: 64,
        zIndex: 40,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 12 }}>
        <div className="tf-cg-bar-icon" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span className="font-caption-s" style={{ marginTop: 2 }}>客服</span>
        </div>
        <div className="tf-cg-bar-icon" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span className="font-caption-s" style={{ marginTop: 2 }}>店铺</span>
        </div>
        <div className="tf-cg-bar-icon" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <span className="font-caption-s" style={{ marginTop: 2 }}>购物车</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flex: 1, gap: 8 }}>
        <button 
          className="font-body-m tap-scale"
          style={{
            flex: 1,
            height: 40,
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: 'var(--color-orange)',
            color: 'var(--color-text-white)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          加入购物车
        </button>
        <button 
          className="font-body-m tap-scale"
          style={{
            flex: 1,
            height: 40,
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-white)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          立即购买
        </button>
      </div>
    </div>
  );
}