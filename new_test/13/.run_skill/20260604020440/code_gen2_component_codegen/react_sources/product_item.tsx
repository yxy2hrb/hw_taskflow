import React from 'react';
import ProductCard from '@/components/ProductCard';

export default function GeneratedComponent() {
  const product = {
    id: 'p1',
    name: 'IdeaHub B2 Base-75寸',
    description: 'EOS 非现货',
    price: 21999
  };

  return (
    <div
      data-component-id="product_item"
      style={{
        position: 'absolute',
        left: 48,
        top: 584,
        width: 264,
        height: 90,
      }}
    >
      <ProductCard product={product} />
    </div>
  );
}