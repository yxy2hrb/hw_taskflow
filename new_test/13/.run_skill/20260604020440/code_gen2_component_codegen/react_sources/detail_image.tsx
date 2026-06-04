import React from 'react';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="detail_image" 
      style={{ 
        position: 'absolute', 
        left: 0, 
        top: 0, 
        width: 360, 
        height: 396,
        overflow: 'hidden',
        backgroundColor: '#f5f5f7',
      }}
    >
      {/* 模拟产品主图 */}
      <div 
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 30% 40%, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 占位产品轮廓 */}
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="30" width="120" height="120" rx="24" fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.9)" strokeWidth="2"/>
          <circle cx="90" cy="90" r="32" fill="rgba(0,0,0,0.05)"/>
          <path d="M75 90L85 100L105 80" stroke="rgba(0,0,0,0.15)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* 底部渐变遮罩，让指示器更清晰 */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* 左上角返回按钮 */}
      <div 
        style={{
          position: 'absolute',
          top: 48,
          left: 16,
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </div>

      {/* 右上角收藏按钮 */}
      <div 
        style={{
          position: 'absolute',
          top: 48,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </div>

      {/* 轮播指示器 */}
      <div 
        style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div style={{ width: 16, height: 4, borderRadius: 'var(--radius-full)', backgroundColor: '#ffffff' }} />
        <div style={{ width: 4, height: 4, borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(255,255,255,0.5)' }} />
        <div style={{ width: 4, height: 4, borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(255,255,255,0.5)' }} />
        <div style={{ width: 4, height: 4, borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(255,255,255,0.5)' }} />
      </div>
    </div>
  );
}