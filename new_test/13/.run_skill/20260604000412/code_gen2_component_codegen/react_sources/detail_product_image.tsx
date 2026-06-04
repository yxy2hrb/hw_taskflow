import React from 'react';

export default function GeneratedComponent() {
  const images = ['product_main_1.jpg'];
  const currentIndex = 0;
  const total = images.length;

  return (
    <div
      data-component-id="detail_product_image"
      style={{
        position: 'absolute',
        left: 0,
        top: 92,
        width: 360,
        height: 360,
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-card)',
      }}
    >
      {/* 图片展示区 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%)',
          position: 'relative',
        }}
      >
        {/* 产品图片占位 */}
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-bg-disabled)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-lg)',
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span
            className="font-body-s"
            style={{ color: 'var(--color-text-hint)' }}
          >
            产品图片
          </span>
        </div>

        {/* 图片序号指示器 */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="font-caption-s"
            style={{
              color: '#ffffff',
              lineHeight: '14px',
            }}
          >
            {currentIndex + 1}/{total}
          </span>
        </div>
      </div>
    </div>
  );
}