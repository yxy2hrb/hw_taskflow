import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function GeneratedComponent() {
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
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <ButtonBar
        variant="dual"
        secondaryLabel="编辑"
        primaryLabel="发送方案"
        width={360}
      />
    </div>
  );
}