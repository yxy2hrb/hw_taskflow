import React from 'react';
import InputDemo from '@/components/InputDemo';
import { CapsuleButton } from '@/components/ui/Button';

export default function EditSheetOverlay() {
  const noop = () => {};

  return (
    <div
      data-component-id="edit_sheet_overlay"
      onClick={noop}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 1180,
        zIndex: 65,
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          padding: '24px 16px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>编辑配单</span>
        </div>
        
        <InputDemo label="配单名称" placeholder="请输入配单名称" />
        
        <CapsuleButton size="large" variant="primary" className="w-full" onClick={noop}>
          确定
        </CapsuleButton>
      </div>
    </div>
  );
}