import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function EditBottomBar() {
  return (
    <div
      data-component-id="edit_bottom_bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 872,
        width: 360,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-card)',
      }}
    >
      <ButtonBar
        variant="single-primary"
        primaryLabel="确定"
        width={360}
      />
    </div>
  );
}