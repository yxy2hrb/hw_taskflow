import React from 'react';

export default function GeneratedComponent() {
  const images = [
    { id: 1, gradient: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)' },
    { id: 2, gradient: 'linear-gradient(135deg, #e8ecf1 0%, #d5dbe3 100%)' },
    { id: 3, gradient: 'linear-gradient(135deg, #f0f2f5 0%, #dde1e7 100%)' },
    { id: 4, gradient: 'linear-gradient(135deg, #eef1f5 0%, #d8dee6 100%)' },
    { id: 5, gradient: 'linear-gradient(135deg, #f2f4f7 0%, #e0e4ea 100%)' },
  ];
  const activeIndex = 0;

  return (
    <div
      data-component-id="detail_image"
      className="tf-cg-carousel"
      style={{
        position: 'absolute',
        left: 0,
        top: 92,
        width: 360,
        height: 360,
        overflow: 'hidden',
        backgroundColor: '#f5f7fa',
      }}
    >
      {/* Main image area */}
      <div
        className="tf-cg-carousel__main"
        style={{
          width: '100%',
          height: '100%',
          background: images[activeIndex].gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Product placeholder icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          style={{ opacity: 0.25 }}
        >
          <rect x="8" y="14" width="64" height="52" rx="8" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" />
          <circle cx="28" cy="34" r="8" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" />
          <path d="M8 52 L28 38 L44 50 L56 42 L72 54" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>

        {/* Image counter badge */}
        <div
          className="tf-cg-carousel__counter"
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-caption-12)',
              lineHeight: 'var(--line-height-16)',
              fontWeight: 'var(--font-weight-medium)',
              color: '#ffffff',
            }}
          >
            {activeIndex + 1}/{images.length}
          </span>
        </div>
      </div>

      {/* Carousel dots */}
      <div
        className="tf-cg-carousel__dots"
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {images.map((img, idx) => (
          <div
            key={img.id}
            style={{
              width: idx === activeIndex ? 16 : 6,
              height: 6,
              borderRadius: 'var(--radius-full)',
              backgroundColor: idx === activeIndex ? 'var(--color-primary)' : 'rgba(0, 0, 0, 0.15)',
              transition: 'all 200ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}