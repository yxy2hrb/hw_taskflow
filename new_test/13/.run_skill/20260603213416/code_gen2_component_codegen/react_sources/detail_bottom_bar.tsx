import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function DetailBottomBar() {
  return (
    <div
      data-component-id="detail_bottom_bar"
      className="tf-cg-detail-bottom-bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 872,
        width: 360,
        height: 64,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--spacing-xl)',
        gap: 'var(--spacing-lg)',
        boxShadow: '0 -1px 6px 0 rgba(0, 0, 0, 0.06)',
        zIndex: 10,
      }}
    >
      {/* 左侧图标组 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        {/* 客服图标 */}
        <button
          className="tf-cg-bottom-icon-btn"
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            gap: 2,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', fontSize: 10, lineHeight: '12px' }}>客服</span>
        </button>

        {/* 购物车图标 */}
        <button
          className="tf-cg-bottom-icon-btn"
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            gap: 2,
            position: 'relative',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', fontSize: 10, lineHeight: '12px' }}>购物车</span>
          {/* 角标 */}
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-white)',
              fontSize: 9,
              lineHeight: '14px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            3
          </span>
        </button>

        {/* 收藏图标 */}
        <button
          className="tf-cg-bottom-icon-btn"
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            gap: 2,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span className="font-caption-s" style={{ color: 'var(--color-text-secondary)', fontSize: 10, lineHeight: '12px' }}>收藏</span>
        </button>
      </div>

      {/* 右侧按钮组 */}
      <div style={{ display: 'flex', flex: 1, gap: 'var(--spacing-md)', marginLeft: 'auto' }}>
        <div style={{ flex: 1 }}>
          <CapsuleButton size="large" variant="secondary" className="w-full">
            加入购物车
          </CapsuleButton>
        </div>
        <div style={{ flex: 1 }}>
          <CapsuleButton size="large" variant="primary" className="w-full">
            立即购买
          </CapsuleButton>
        </div>
      </div>
    </div>
  );
}