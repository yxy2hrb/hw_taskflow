import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_info_name from './info_name';
import Child_info_price from './info_price';
import Child_info_params from './info_params';
import Child_info_stock from './info_stock';
import Child_info_accessories from './info_accessories';

export default function GeneratedComponent() {
  return (
    <div data-component-id="product_info_card">
      <SectionLayout variant="card" title="产品信息">
        <div className="tf-cg-product-info-content">
          <Child_info_name />
          <Child_info_price />
          <Child_info_params />
          <div className="tf-cg-product-info-row">
            <Child_info_stock />
          </div>
          <Child_info_accessories />
        </div>
      </SectionLayout>
    </div>
  );
}