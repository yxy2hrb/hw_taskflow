import React from 'react';

export default function ProductTitle() {
  return (
    <div
      data-component-id="product_title"
      className="font-headline-s"
      style={{
        position: 'absolute',
        left: '24px',
        top: '476px',
        width: '312px',
        height: '24px',
        fontSize: 'var(--font-headline-16)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}
    >
      IdeaHub B2 Base-75寸
    </div>
  );
}