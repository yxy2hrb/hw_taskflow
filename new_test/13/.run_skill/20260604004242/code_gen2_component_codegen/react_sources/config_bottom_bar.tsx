import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function ConfigBottomBar() {
  const noop = () => {};

  return (
    <div
      data-component-id="config_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 872,
        width: 360,
        height: 64,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-xl)',
        boxShadow: '0 -1px 4px rgba(0,0,0,0.06)',
        zIndex: 10,
      }}
    >
      {/* 左侧图标按钮组 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2xl)' }}>
        {/* 点位图 */}
        <button
          onClick={noop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
            <path d="M9 4v13" />
            <path d="M15 7v13" />
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)' }}>点位图</span>
        </button>

        {/* 采购咨询 */}
        <button
          onClick={noop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            <path d="M8 10h8" />
            <path d="M8 14h4" />
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)' }}>采购咨询</span>
        </button>
      </div>

      {/* 右侧导出按钮 */}
      <CapsuleButton size="large" variant="primary" onClick={noop}>
        导出
      </CapsuleButton>
    </div>
  );
}