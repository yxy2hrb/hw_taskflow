import React from 'react';
import InputDemo from '@/components/InputDemo';
import { CapsuleButton } from '@/components/ui/Button';

export default function EditSheet() {
  const noop = () => {};

  return (
    <div
      data-component-id="edit_sheet"
      className="tf-cg-edit-sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 870,
        width: 360,
        height: 374,
        zIndex: 65,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-2xl) var(--spacing-xl)',
      }}
    >
      {/* Header: Title + Close Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        <span
          className="font-headline-s"
          style={{
            fontSize: 'var(--font-headline-16)',
            lineHeight: 'var(--line-height-20)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
          }}
        >
          编辑配单信息
        </span>
        <button
          onClick={noop}
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="关闭"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="var(--color-text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Body: Input Field */}
      <div style={{ flex: 1 }}>
        <InputDemo
          label="配单名称"
          placeholder="请输入配单名称"
          disabled={true}
        />
      </div>

      {/* Footer: Confirm Button */}
      <div style={{ marginTop: 'var(--spacing-2xl)' }}>
        <CapsuleButton
          size="large"
          variant="primary"
          className="w-full"
          onClick={noop}
          disabled={true}
        >
          提交中...
        </CapsuleButton>
      </div>
    </div>
  );
}