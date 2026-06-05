import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 1116,
        width: 360,
        height: 64,
        zIndex: 10,
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ButtonBar
        variant="triple"
        primaryLabel="加入配单"
        secondaryLabel="加入采购单"
        thirdLabel="对比/咨询"
        width={360}
      />
    </div>
  );
}