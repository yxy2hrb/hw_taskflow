import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 904,
        width: 360,
        height: 64,
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
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