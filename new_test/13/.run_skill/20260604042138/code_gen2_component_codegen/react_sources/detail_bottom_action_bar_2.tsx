import React from 'react';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="detail_bottom_action_bar_2"
      style={{
        position: 'absolute',
        left: 0,
        top: 1024,
        width: 360,
        height: 64,
        zIndex: 40,
        backgroundColor: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="flex-col items-center" style={{ cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-text-primary)'}}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>客服</span>
        </div>
        <div className="flex-col items-center" style={{ cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-text-primary)'}}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>收藏</span>
        </div>
      </div>
      <button 
        className="font-headline-s"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-text-white)',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '10px 36px',
          cursor: 'pointer',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(199, 0, 11, 0.24)'
        }}
      >
        采纳方案
      </button>
    </div>
  );
}