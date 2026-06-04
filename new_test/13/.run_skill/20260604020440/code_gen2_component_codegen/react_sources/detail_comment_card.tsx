import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_comment_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 964,
        width: 336,
        height: 140,
      }}
    >
      <SectionLayout variant="card" title="评论/问答">
        <div
          className="flex items-center justify-center"
          style={{ padding: '24px 0' }}
        >
          <span
            className="font-caption-m"
            style={{
              fontSize: 'var(--font-caption-12)',
              lineHeight: 'var(--line-height-18)',
              color: 'var(--color-text-muted)',
            }}
          >
            暂无评价，快来抢占沙发吧！
          </span>
        </div>
      </SectionLayout>
    </div>
  );
}