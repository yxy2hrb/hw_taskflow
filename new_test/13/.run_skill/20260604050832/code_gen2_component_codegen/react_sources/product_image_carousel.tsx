import React from 'react';

export default function ProductImageCarousel() {
  const images = ["product_main_1.jpg", "product_main_2.jpg"];

  return (
    <div 
      data-component-id="product_image_carousel" 
      className="tf-cg-carousel"
    >
      <div className="tf-cg-carousel-placeholder" />
      <img 
        src={images[0]} 
        alt="Product" 
        className="tf-cg-carousel-image"
      />
      <div className="tf-cg-carousel-indicators">
        {images.map((_, index) => (
          <div 
            key={index} 
            className={`tf-cg-carousel-dot ${index === 0 ? 'active' : ''}`} 
          />
        ))}
      </div>
    </div>
  );
}