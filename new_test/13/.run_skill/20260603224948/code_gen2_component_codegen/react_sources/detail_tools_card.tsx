import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_tools_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 708,
        width: 336,
        height: 80,
        zIndex: undefined,
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{
          padding: 'var(--spacing-lg)',
          gap: 'var(--spacing-lg)',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* SectionTitle - card variant */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-headline-16)',
              lineHeight: 'var(--line-height-20)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            售前/售后工具
          </span>
          <button
            className="flex items-center bg-transparent border-none cursor-pointer"
            style={{ gap: 2 }}
            onClick={() => {}}
          >
            <span className="font-headline-xs" style={{ color: 'var(--color-text-secondary)' }}>
              更多
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}