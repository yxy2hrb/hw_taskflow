import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function DetailBottomBar() {
  const noop = () => {};

  return (
    <div
      data-component-id="detail_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 1180,
        width: 360,
        height: 64,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--spacing-xl)',
        gap: 'var(--spacing-lg)',
        boxShadow: '0 -1px 6px 0 rgba(0,0,0,0.06)',
        zIndex: 20,
      }}
    >
      {/* 左侧图标按钮组 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)', flexShrink: 0 }}>
        {/* 产品对比 */}
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1.5" />
            <rect x="14" y="3" width="7" height="18" rx="1.5" />
            <line x1="6.5" y1="8" x2="6.5" y2="8.01" />
            <line x1="17.5" y1="8" x2="17.5" y2="8.01" />
          </svg>
          <span
            className="font-caption-s"
            style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
          >
            对比
          </span>
        </button>

        {/* 咨询 */}
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span
            className="font-caption-s"
            style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
          >
            咨询
          </span>
        </button>
      </div>

      {/* 右侧按钮组 */}
      <div style={{ display: 'flex', flex: 1, gap: 'var(--spacing-md)', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CapsuleButton size="large" variant="secondary" className="w-full" onClick={noop}>
            加入采购单
          </CapsuleButton>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CapsuleButton size="large" variant="primary" className="w-full" onClick={noop}>
            加入配单
          </CapsuleButton>
        </div>
      </div>
    </div>
  );
}