import React from 'react';

export default function ProductImageArea() {
  const noop = () => {};

  return (
    <div
      data-component-id="product_image_area"
      style={{
        position: 'absolute',
        left: 0,
        top: 92,
        width: 360,
        height: 360,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
      }}
    >
      {/* 主图展示区 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E8E8E8 0%, #F5F5F5 50%, #E0E0E0 100%)',
          position: 'relative',
        }}
      >
        {/* 产品图片占位 */}
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
          >
            <rect x="8" y="16" width="64" height="48" rx="8" stroke="rgba(0,0,0,0.15)" strokeWidth="2" fill="rgba(255,255,255,0.8)" />
            <circle cx="28" cy="34" r="6" fill="rgba(0,0,0,0.1)" />
            <path d="M8 52 L28 38 L44 50 L56 42 L72 54" stroke="rgba(0,0,0,0.12)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        {/* 图片序号指示器 */}
        <div
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
            className="font-caption-m"
            style={{
              color: '#ffffff',
              fontSize: 12,
              lineHeight: '16px',
            }}
          >
            1/5
          </span>
        </div>

        {/* 底部轮播指示点 */}
        <div
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
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: i === 0 ? 16 : 6,
                height: 6,
                borderRadius: 'var(--radius-full)',
                backgroundColor: i === 0 ? 'var(--color-primary)' : 'rgba(0,0,0,0.15)',
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}