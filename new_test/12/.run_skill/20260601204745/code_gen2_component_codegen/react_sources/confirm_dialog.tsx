import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  const noop = () => {};
  return (
    <div
      data-component-id="confirm_dialog"
      className="tf-cg-dialog-overlay"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 1248,
        backgroundColor: 'var(--color-mask)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="tf-cg-dialog-card"
        style={{
          width: 280,
          minHeight: 160,
          borderRadius: 'var(--radius-2xl)',
          backgroundColor: 'var(--color-bg-card)',
          padding: '20px var(--spacing-2xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <span
          className="font-headline-m"
          style={{ color: 'var(--color-text-primary)' }}
        >
          移除卡片
        </span>
        <span
          className="font-body-m-multi"
          style={{
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
          }}
        >
          确定要移除'分享获客'卡片吗？
        </span>
        <div
          style={{
            display: 'flex',
            width: '100%',
            gap: 'var(--spacing-lg)',
            marginTop: 'var(--spacing-xs)',
          }}
        >
          <div style={{ flex: 1 }}>
            <CapsuleButton size="large" variant="secondary" className="w-full" onClick={noop}>
              取消
            </CapsuleButton>
          </div>
          <div style={{ flex: 1 }}>
            <CapsuleButton size="large" variant="primary" className="w-full" onClick={noop}>
              移除
            </CapsuleButton>
          </div>
        </div>
      </div>
    </div>
  );
}