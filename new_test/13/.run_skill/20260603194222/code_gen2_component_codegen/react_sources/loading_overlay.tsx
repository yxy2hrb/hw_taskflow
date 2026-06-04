import React from 'react';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="loading_overlay" 
      className="tf-cg-loading-overlay"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 936,
        backgroundColor: 'var(--color-mask)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div className="tf-cg-spinner" style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: '#ffffff',
        borderRadius: '50%',
        marginBottom: 16,
      }} />
      <span style={{
        color: 'var(--color-text-white)',
        fontSize: 'var(--font-body-14)',
        lineHeight: 'var(--line-height-20)',
        fontWeight: 'var(--font-weight-medium)',
        fontFamily: "'HarmonyOS Sans SC', sans-serif",
      }}>
        正在生成最终方案...
      </span>
    </div>
  );
}