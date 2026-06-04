import React from 'react';
export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_image"
      className="tf-cg-detail-image"
      style={{
        position: 'absolute',
        left: 0,
        top: 80,
        width: 360,
        height: 240,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* 产品图片占位 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-md)',
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          style={{ opacity: 0.3 }}
        >
          <rect x="6" y="10" width="36" height="28" rx="4" stroke="rgba(0,0,0,0.4)" strokeWidth="2" fill="none" />
          <circle cx="18" cy="22" r="4" stroke="rgba(0,0,0,0.4)" strokeWidth="2" fill="none" />
          <path d="M6 34l10-8 8 6 8-10 10 12" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span
          className="font-body-s"
          style={{ color: 'var(--color-text-hint)' }}
        >
          产品图片
        </span>
      </div>

      {/* 图片计数指示器 */}
      <div
        style={{
          position: 'absolute',
          bottom: 'var(--spacing-lg)',
          right: 'var(--spacing-xl)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 'var(--radius-full)',
          padding: '2px 8px',
        }}
      >
        <span
          className="font-caption-s"
          style={{ color: 'var(--color-text-white)' }}
        >
          1/5
        </span>
      </div>
    </div>
  );
}