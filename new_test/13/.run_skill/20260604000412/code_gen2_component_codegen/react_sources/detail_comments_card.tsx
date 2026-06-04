import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_comments_card"
      style={{
        position: 'absolute',
        left: 16,
        top: 980,
        width: 328,
        height: 120,
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{ padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)', width: '100%', height: '100%' }}
      >
        {/* SectionTitle — 评论/问答 */}
        <div className="flex items-center justify-between">
          <span
            className="font-headline-s"
            style={{ color: 'var(--color-text-primary)' }}
          >
            评论/问答
          </span>
        </div>
        {/* 空状态占位 */}
        <div className="flex items-center justify-center flex-1">
          <span className="font-body-s" style={{ color: 'var(--color-text-hint)' }}>
            暂无评论
          </span>
        </div>
      </div>
    </div>
  );
}