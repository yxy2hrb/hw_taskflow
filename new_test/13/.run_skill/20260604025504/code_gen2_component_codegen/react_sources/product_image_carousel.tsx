import React from 'react';

export default function ProductImageCarousel() {
  return (
    <div 
      data-component-id="product_image_carousel"
      className="tf-cg-carousel-root"
      style={{
        position: 'absolute',
        left: 0,
        top: 92,
        width: 360,
        height: 360,
      }}
    >
      <img 
        src="product_main.jpg" 
        alt="产品主图" 
        className="tf-cg-carousel-img"
      />
      <div className="tf-cg-carousel-indicator font-caption-m">
        1/1
      </div>
    </div>
  );
}