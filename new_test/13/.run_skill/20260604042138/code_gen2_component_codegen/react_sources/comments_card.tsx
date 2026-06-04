import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function CommentsCard() {
  return (
    <div 
      data-component-id="comments_card" 
      style={{
        position: 'absolute',
        left: 12,
        top: 1100,
        width: 336,
        height: 160
      }}
    >
      <SectionLayout 
        variant="card" 
        title="评论/问答" 
        moreText="查看全部" 
        onMore={() => {}}
      >
        <div className="flex items-center justify-center font-body-m" style={{ color: 'var(--color-text-muted)', height: 88 }}>
          暂无评论，快来抢沙发吧~
        </div>
      </SectionLayout>
    </div>
  );
}