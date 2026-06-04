import React from 'react';

export default function EditListSheet() {
  return (
    <div 
      data-component-id="edit_list_sheet"
      className="tf-cg-bottom-sheet"
      style={{
        position: 'absolute',
        left: '0px',
        top: '816px',
        width: '360px',
        height: '544px',
        zIndex: 70,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div className="tf-cg-sheet-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-xl)',
        borderBottom: '1px solid var(--color-divider-subtle)'
      }}>
        <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>
          编辑配单信息
        </span>
        <button 
          className="tf-cg-close-btn"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-hover)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--color-text-secondary)'
          }}
          aria-label="关闭"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="tf-cg-sheet-body" style={{
        flex: 1,
        padding: 'var(--spacing-xl)',
        overflowY: 'auto'
      }}>
      </div>
    </div>
  );
}