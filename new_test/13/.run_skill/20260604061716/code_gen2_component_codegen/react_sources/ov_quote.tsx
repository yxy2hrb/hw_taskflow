import React from 'react';

export default function OvQuote() {
  return (
    <div
      data-component-id="ov_quote"
      className="font-headline-s tf-cg-ov-quote"
      style={{
        fontSize: 'var(--font-headline-16)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-primary)'
      }}
    >
      总报价：¥45,998.00
    </div>
  );
}