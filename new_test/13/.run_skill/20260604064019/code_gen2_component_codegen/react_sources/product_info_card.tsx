import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_prod_name from './prod_name';
import Child_prod_code from './prod_code';
import Child_prod_price from './prod_price';
import Child_prod_params from './prod_params';
import Child_prod_stock from './prod_stock';
import Child_prod_accessories_btn from './prod_accessories_btn';

export default function ProductInfoCard() {
  return (
    <div data-component-id="product_info_card">
      <SectionLayout variant="card" title="产品信息">
        <div className="tf-cg-product-info-content flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
            <Child_prod_name />
            <Child_prod_code />
          </div>
          <Child_prod_price />
          <Child_prod_params />
          <div className="flex items-center justify-between">
            <Child_prod_stock />
            <Child_prod_accessories_btn />
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}