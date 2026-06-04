import React from 'react';
export default function GeneratedComponent() {
  return (
    <div data-component-id="btn_confirm_edit" style={{ position: 'absolute', left: 20, top: 850, width: 320, height: 44 }}>
      <button
        className="tf-cg-btn-confirm w-full h-full rounded-[var(--radius-full)] font-headline-s flex items-center justify-center"
        style={{
          backgroundColor: 'var(--color-primary-disabled)',
          color: 'var(--color-text-white)',
          border: 'none',
          cursor: 'not-allowed',
          gap: 'var(--spacing-xs)',
        }}
        disabled
      >
        <svg className="tf-cg-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        提交中...
      </button>
    </div>
  );
}