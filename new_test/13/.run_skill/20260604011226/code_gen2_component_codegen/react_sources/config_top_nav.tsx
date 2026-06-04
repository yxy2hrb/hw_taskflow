import React from 'react';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="config_top_nav" 
      className="flex items-center justify-between flex-shrink-0"
      style={{ 
        position: 'absolute',
        left: 0, 
        top: 36, 
        width: 360, 
        height: 56, 
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box'
      }}
    >
      <div className="flex items-center min-w-0" style={{ gap: 'var(--spacing-lg)' }}>
        <button
          className="flex items-center justify-center bg-transparent border-none cursor-pointer flex-shrink-0"
          style={{ width: 24, height: 40, color: 'var(--color-text-primary)' }}
          onClick={() => {}}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginLeft: -4 }}>
            <path
              d="M15 19L8 12L15 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="min-w-0">
          <div
            className="font-headline-xxl truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            配单详情
          </div>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 5 }}>
        <button
          className="flex items-center justify-center bg-transparent border-none cursor-pointer relative"
          style={{ width: 40, height: 40, color: 'var(--color-text-primary)' }}
          onClick={() => {}}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </div>
  );
}