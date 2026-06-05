import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_comment_summary from './comment_summary';
import Child_comment_item from './comment_item';

export default function GeneratedComponent() {
  return (
    <div data-component-id="comments_card">
      <SectionLayout
        variant="card"
        title="评论/问答"
        onMore={() => {}}
      >
        <Child_comment_summary />
        <Child_comment_item />
      </SectionLayout>
    </div>
  );
}