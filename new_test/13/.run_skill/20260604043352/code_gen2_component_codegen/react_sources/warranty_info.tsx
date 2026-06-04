import React from 'react';

export default function WarrantyInfo() {
  return (
    <div
      data-component-id="warranty_info"
      style={{
        position: 'absolute',
        left: 24,
        top: 788,
        width: 312,
        height: 40,
      }}
    >
      <p
        className="font-body-m tf-cg-warranty-text"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          whiteSpace: 'pre-line',
          lineHeight: 'var(--line-height-20)',
        }}
      >
        保修政策：全国联保，享受三包服务
质保服务：整机1年，主要部件3年
      </p>
    </div>
  );
}