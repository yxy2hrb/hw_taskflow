import React from 'react';

export default function GeneratedComponent() {
  const images = ["product_main_1.jpg", "product_main_2.jpg"];
  
  return (
    <div data-component-id="product_image_carousel" className="tf-cg-carousel">
      <div className="tf-cg-carousel-slide">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
      <div className="tf-cg-carousel-indicators">
        {images.map((_, index) => (
          <div 
            key={index} 
            className={`tf-cg-indicator ${index === 0 ? 'active' : 'inactive'}`}
          />
        ))}
      </div>
    </div>
  );
}