import React from 'react';

export default function WarrantyInfo() {
  return (
    <div
      data-component-id="warranty_info"
      className="font-body-m"
      style={{
        position: 'absolute',
        left: 24,
        top: 788,
        width: 312,
        minHeight: 40,
        color: 'var(--color-text-secondary)',
        whiteSpace: 'pre-line'
      }}
    >
      保修政策：全国联保，享受三包服务{'\n'}质保服务：整机1年，主要部件3年
    </div>
  );
}