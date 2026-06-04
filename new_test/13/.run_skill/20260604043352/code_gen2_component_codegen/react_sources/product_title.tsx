import React from 'react';

export default function ProductTitle() {
  return (
    <div
      data-component-id="product_title"
      style={{
        position: 'absolute',
        left: '24px',
        top: '476px',
        width: '312px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="font-headline-s"
        style={{
          fontSize: 'var(--font-headline-16)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        IdeaHub B2 Base-75寸
      </span>
    </div>
  );
}