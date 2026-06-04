import React from 'react';
import ProductSelectionListItem from '@/components/ProductSelectionListItem';

export default function SelectedProductItem() {
  const item = {
    id: 'p1',
    name: 'IdeaHub B2 Base-75寸',
    status: '谈单中' as const,
    time: '¥21,999.00'
  };

  return (
    <div
      data-component-id="selected_product_item"
      style={{
        position: 'absolute',
        left: 16,
        top: 660,
        width: 328,
        minHeight: 72,
      }}
    >
      <ProductSelectionListItem
        item={item}
        isLast={true}
      />
    </div>
  );
}