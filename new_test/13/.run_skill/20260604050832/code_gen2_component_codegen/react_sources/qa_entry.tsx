import React from 'react';

export default function QaEntry() {
  return (
    <span 
      data-component-id="qa_entry"
      className="font-body-m tf-cg-qa-entry"
      style={{
        fontSize: 'var(--font-body-14)',
        lineHeight: 'var(--line-height-20)',
        fontWeight: 'var(--font-weight-regular)',
        color: 'var(--color-primary)'
      }}
    >
      查看全部评价 &gt;
    </span>
  );
}