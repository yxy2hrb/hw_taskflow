import React from 'react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_image"
      style={{
        position: 'absolute',
        left: 0,
        top: 92,
        width: 360,
        height: 240,
      }}
    >
      {/* 产品主图区域 */}
      <div
        className="tf-cg-carousel"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        {/* 产品图片占位 - 使用渐变模拟产品图 */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 50%, #f0f0f0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 产品图标占位 */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            style={{ opacity: 0.3 }}
          >
            <rect
              x="10"
              y="15"
              width="60"
              height="50"
              rx="8"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="30"
              cy="35"
              r="6"
              fill="rgba(0,0,0,0.15)"
            />
            <path
              d="M10 55 L30 40 L45 50 L55 42 L70 55"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 图片序号指示器 */}
        <div
          className="tf-cg-indicator"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              color: 'var(--color-text-white)',
            }}
          >
            1/5
          </span>
        </div>
      </div>
    </div>
  );
}