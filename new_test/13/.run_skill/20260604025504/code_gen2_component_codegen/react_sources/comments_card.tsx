import React from 'react'
import SectionLayout from '@/components/SectionLayout'

export default function CommentsCard() {
  return (
    <div 
      data-component-id="comments_card" 
      style={{
        position: 'absolute',
        left: 12,
        top: 1100,
        width: 336,
        height: 160,
      }}
    >
      <SectionLayout
        variant="card"
        title="评论/问答"
        moreText="查看全部"
        onMore={() => {}}
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <div className="rounded-[var(--radius-full)] bg-[var(--color-bg-hover)]" style={{ width: 24, height: 24 }} />
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>用户***8</span>
            </div>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>质量很好，做工精细，非常满意！</span>
          </div>
          <div className="divider" />
          <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <div className="rounded-[var(--radius-full)] bg-[var(--color-bg-hover)]" style={{ width: 24, height: 24 }} />
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>用户***2</span>
            </div>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>物流很快，包装也很精美。</span>
          </div>
        </div>
      </SectionLayout>
    </div>
  )
}