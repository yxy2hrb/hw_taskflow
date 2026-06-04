import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="管理应用跳转按钮-底部靠上"
      className="tf-cg-manage-btn"
      style={{
        position: 'absolute',
        left: 16,
        top: 960,
        width: 328,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <button
        className="tf-cg-manage-btn-inner"
        style={{
          width: '100%',
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-xs)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          className="font-headline-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          管理应用
        </span>
        <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
      </button>
    </div>
  );
}