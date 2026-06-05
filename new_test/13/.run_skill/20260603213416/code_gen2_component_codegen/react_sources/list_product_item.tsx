import React from 'react';
import ProductSelectionListItem from '@/components/ProductSelectionListItem';

export default function GeneratedComponent() {
  const item = {
    id: "p1",
    name: "IdeaHub B2 Base-75寸",
    status: "谈单中" as '谈单中' | '已成单' | '未成单',
    time: ""
  };

  return (
    <div 
      data-component-id="list_product_item" 
      style={{ 
        position: 'absolute', 
        left: 16, 
        top: 496, 
        width: 328, 
        height: 72 
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