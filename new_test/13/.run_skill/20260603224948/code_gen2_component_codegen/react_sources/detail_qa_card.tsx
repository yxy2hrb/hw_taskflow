import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_qa_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 800,
        width: 336,
        height: 60,
        zIndex: 1,
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{
          width: '100%',
          height: '100%',
          padding: 'var(--spacing-lg)',
          boxSizing: 'border-box',
        }}
      >
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
            评论/问答
          </span>
          <button
            className="flex items-center bg-transparent border-none cursor-pointer"
            style={{ gap: 2 }}
            onClick={() => {}}
          >
            <span
              className="font-headline-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              更多
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}