import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function ConfigBottomBar() {
  return (
    <div
      data-component-id="config_bottom_bar"
      style={{
        position: 'absolute',
        top: 1004,
        left: 0,
        width: 360,
        height: 64,
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <ButtonBar
        variant="triple"
        thirdLabel="点位图"
        secondaryLabel="采购咨询"
        primaryLabel="导出"
        width={360}
      />
    </div>
  );
}