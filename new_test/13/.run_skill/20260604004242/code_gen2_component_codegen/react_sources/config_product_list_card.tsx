import React from 'react';
import SectionTitle from '@/components/SectionTitle';

export default function ConfigProductListCard() {
  return (
    <div
      data-component-id="config_product_list_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 408,
        width: 360,
        height: 200,
        boxSizing: 'border-box',
        padding: '0 16px',
      }}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] flex flex-col"
        style={{
          padding: 'var(--spacing-lg)',
          gap: 'var(--spacing-lg)',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <SectionTitle
          variant="card"
          title="产品清单"
        />
        <div className="flex-1 flex items-center justify-center">
          <span className="font-body-s" style={{ color: 'var(--color-text-hint)' }}>
            暂无产品数据
          </span>
        </div>
      </div>
    </div>
  );
}