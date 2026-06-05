import React from 'react';

export default function CommentsCard() {
  return (
    <div
      data-component-id="comments_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 1020,
        width: 360,
        height: 160,
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
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
        {/* SectionTitle row */}
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
          >
            <span className="font-headline-xs" style={{ color: 'var(--color-text-secondary)' }}>
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

        {/* Content area placeholder */}
        <div className="flex items-center justify-center flex-1">
          <span className="font-body-m" style={{ color: 'var(--color-text-muted)' }}>
            暂无评论
          </span>
        </div>
      </div>
    </div>
  );
}