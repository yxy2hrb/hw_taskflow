import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_pl_item from './pl_item';

export default function ProductListCard() {
  return (
    <div
      data-component-id="product_list_card"
      className="tf-cg-product-list-card"
      style={{
        position: 'absolute',
        left: 12,
        top: 428,
        width: 336,
        minHeight: 240,
      }}
    >
      <SectionLayout variant="card" title="产品清单">
        <Child_pl_item />
      </SectionLayout>
    </div>
  );
}