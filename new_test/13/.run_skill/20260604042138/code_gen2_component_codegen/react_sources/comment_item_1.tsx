import React from 'react';

export default function CommentItem1() {
  return (
    <div
      data-component-id="comment_item_1"
      style={{
        position: 'absolute',
        left: '24px',
        top: '1112px',
        width: '312px',
        minHeight: '48px',
      }}
    >
      <p
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        用户评价：设备非常清晰，会议体验很好，投屏稳定。
      </p>
    </div>
  );
}