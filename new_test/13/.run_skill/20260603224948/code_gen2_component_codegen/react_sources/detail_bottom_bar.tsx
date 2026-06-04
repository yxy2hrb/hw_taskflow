import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 872,
        width: 360,
        height: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-card)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 360,
          minWidth: 328,
          padding: 'var(--spacing-xl) var(--spacing-xl) 0',
        }}
      >
        <div style={{ width: '100%', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="flex w-full" style={{ gap: 'var(--spacing-lg)' }}>
            <div className="flex-1" style={{ minWidth: 120 }}>
              <CapsuleButton size="large" variant="secondary-primary" className="w-full" onClick={() => {}}>
                加入采购单
              </CapsuleButton>
            </div>
            <div className="flex-1" style={{ minWidth: 120 }}>
              <CapsuleButton size="large" variant="primary" className="w-full" onClick={() => {}}>
                加入配单
              </CapsuleButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}