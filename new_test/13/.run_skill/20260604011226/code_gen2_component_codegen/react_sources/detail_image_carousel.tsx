import React from 'react';

export default function GeneratedComponent() {
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
        backgroundColor: 'var(--color-bg-disabled)'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: 'linear-gradient(135deg, #f6f6f5 0%, #e8e8e6 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>

      {/* Indicator */}
      <div style={{ 
        position: 'absolute', 
        bottom: 12, 
        left: 0, 
        right: 0, 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 6 
      }}>
        <div style={{ 
          width: 16, 
          height: 4, 
          borderRadius: 'var(--radius-full)', 
          backgroundColor: 'var(--color-primary)' 
        }} />
      </div>
    </div>
  );
}