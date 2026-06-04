import React from 'react';

export default function ProductTitle() {
  return (
    <div
      data-component-id="product_title"
      style={{
        position: 'absolute',
        left: 24,
        top: 476,
        width: 312,
        height: 24,
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
        }}
      >
        IdeaHub B2 Base-75寸
      </span>
    </div>
  );
}