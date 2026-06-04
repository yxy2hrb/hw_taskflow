import React from 'react';

export default function GeneratedComponent() {
  const images = [
    { id: 1, gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
    { id: 2, gradient: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)' },
    { id: 3, gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
    { id: 4, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 5, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  ];

  const currentIndex = 0;

  return (
    <div
      data-component-id="detail_image_carousel"
      className="tf-cg-carousel"
      style={{
        position: 'absolute',
        left: 0,
        top: 92,
        width: 360,
        height: 300,
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-card)',
      }}
    >
      {/* Main Image Display */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: images[currentIndex].gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Placeholder product icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>

        {/* Page Indicator - bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
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
              color: 'var(--color-text-white)',
            }}
          >
            {currentIndex + 1}/{images.length}
          </span>
        </div>

        {/* Dot Indicators - bottom center */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {images.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 'var(--radius-full)',
                backgroundColor:
                  index === currentIndex
                    ? 'var(--color-primary)'
                    : 'rgba(255, 255, 255, 0.6)',
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}