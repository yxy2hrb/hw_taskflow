import React from 'react';
import ProductSelectionListItem from '@/components/ProductSelectionListItem';

export default function GeneratedComponent() {
  const item = {
    id: 'p1',
    name: 'IdeaHub B2 Base-75寸',
    status: '谈单中' as const,
    time: '¥21,999.00 x 1'
  };

  return (
    <div 
      data-component-id="list_item_1" 
      style={{
        position: 'absolute',
        left: 24,
        top: 440,
        width: 312,
        height: 59,
      }}
    >
      <ProductSelectionListItem 
        item={item}
        onForward={() => {}}
        onMore={() => {}}
        onStatusChange={() => {}}
      />
    </div>
  );
}