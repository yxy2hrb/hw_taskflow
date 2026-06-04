import React from 'react';
import ProductSelectionListItem from '@/components/ProductSelectionListItem';

export default function GeneratedComponent() {
  const item = {
    id: 'p2',
    name: 'IdeaShare KEY (Type-A)',
    status: '谈单中' as '谈单中' | '已成单' | '未成单',
    time: '¥1,999.00 x 2',
  };

  return (
    <div
      data-component-id="list_item_2"
      style={{
        position: 'absolute',
        left: 24,
        top: 499,
        width: 312,
        height: 59,
      }}
    >
      <ProductSelectionListItem item={item} isLast={false} />
    </div>
  );
}