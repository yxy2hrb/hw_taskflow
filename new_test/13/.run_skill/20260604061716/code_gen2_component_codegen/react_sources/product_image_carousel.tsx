import React from 'react';

export default function ProductImageCarousel() {
  const images = ["main_image_1.jpg"];
  const showIndicator = true;

  return (
    <div data-component-id="product_image_carousel" className="tf-cg-carousel">
      <div className="tf-cg-carousel__track">
        {images.map((img, idx) => (
          <div key={idx} className="tf-cg-carousel__slide">
            <div className="tf-cg-carousel__img-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-text-disabled)'}}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
          </div>
        ))}
      </div>
      {showIndicator && (
        <div className="tf-cg-carousel__indicator">
          <span className="tf-cg-carousel__indicator-text">1 / {images.length}</span>
        </div>
      )}
    </div>
  );
}