import React from 'react';
import InputDemo from '@/components/InputDemo';
import { CapsuleButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="edit_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 656,
        width: 360,
        height: 280,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-2xl)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <span className="font-headline-m" style={{ color: 'var(--color-text-primary)' }}>
          编辑配单
        </span>
      </div>

      {/* Input Field */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <InputDemo
          label="配单名称"
          placeholder="请输入配单名称"
        />
      </div>

      {/* Confirm Button */}
      <div style={{ marginTop: 'auto' }}>
        <CapsuleButton
          size="large"
          variant="primary"
          className="w-full"
          onClick={() => {}}
        >
          确定
        </CapsuleButton>
      </div>
    </div>
  );
}