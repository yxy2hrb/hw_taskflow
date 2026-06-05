import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  const noop = () => {};
  return (
    <div
      data-component-id="config_detail_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 872,
        width: 360,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          padding: '0 var(--spacing-xl)',
          gap: 'var(--spacing-lg)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: 1 }}>
          <CapsuleButton size="large" variant="secondary" className="w-full" onClick={noop}>
            点位图
          </CapsuleButton>
        </div>
        <div style={{ flex: 1 }}>
          <CapsuleButton size="large" variant="secondary-primary" className="w-full" onClick={noop}>
            采购咨询
          </CapsuleButton>
        </div>
        <div style={{ flex: 1 }}>
          <CapsuleButton size="large" variant="primary" className="w-full" onClick={noop}>
            导出
          </CapsuleButton>
        </div>
      </div>
    </div>
  );
}