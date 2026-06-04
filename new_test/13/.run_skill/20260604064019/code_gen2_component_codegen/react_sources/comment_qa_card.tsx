import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_qa_summary from './qa_summary';
import Child_qa_comment from './qa_comment';

export default function GeneratedComponent() {
  return (
    <div data-component-id="comment_qa_card" className="tf-cg-comment-qa-card">
      <SectionLayout
        variant="card"
        title="评论/问答"
        moreText="查看全部"
        onMore={() => {}}
      >
        <div className="tf-cg-comment-qa-content">
          <Child_qa_summary />
          <Child_qa_comment />
        </div>
      </SectionLayout>
    </div>
  );
}