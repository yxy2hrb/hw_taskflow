import React from 'react';

export default function WarrantyInfo() {
  return (
    <div
      data-component-id="warranty_info"
      className="font-body-m"
      style={{
        position: 'absolute',
        left: '24px',
        top: '788px',
        width: '312px',
        height: '40px',
        fontSize: 'var(--font-body-14)',
        color: 'var(--color-text-secondary)',
        whiteSpace: 'pre-wrap',
        lineHeight: 'var(--line-height-18)'
      }}
    >
      保修政策：全国联保，享受三包服务<br />质保服务：整机1年，主要部件3年
    </div>
  );
}