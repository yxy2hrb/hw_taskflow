import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_p_info_title from './p_info_title';
import Child_p_info_price from './p_info_price';
import Child_p_info_params from './p_info_params';

export default function ProductInfoCard() {
  return (
    <div data-component-id="product_info_card" style={{ width: '336px' }}>
      <SectionLayout variant="card" title="产品信息">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <Child_p_info_title />
          <Child_p_info_price />
          <Child_p_info_params />
        </div>
      </SectionLayout>
    </div>
  );
}