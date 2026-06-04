import React from 'react';
import InputDemo from '@/components/InputDemo';
import { CapsuleButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="edit_info_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 824,
        width: 360,
        height: 356,
        zIndex: 70,
      }}
    >
      <div
        className="tf-cg-sheet"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header: Title + Close */}
        <div
          className="tf-cg-sheet-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-xl)',
            flexShrink: 0,
            height: 56,
          }}
        >
          <span
            className="font-headline-m"
            style={{
              fontSize: 'var(--font-headline-18)',
              lineHeight: 'var(--line-height-24)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            编辑配单信息
          </span>
          <button
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-text-muted)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)', margin: '0 var(--spacing-xl)' }} />

        {/* Body: Input Field */}
        <div
          className="tf-cg-sheet-body"
          style={{
            flex: 1,
            padding: 'var(--spacing-2xl) var(--spacing-xl)',
            overflowY: 'auto',
          }}
        >
          <InputDemo
            label="配单名称"
            placeholder="请输入配单名称"
          />
        </div>

        {/* Footer: Confirm Button */}
        <div
          className="tf-cg-sheet-footer"
          style={{
            padding: 'var(--spacing-xl)',
            paddingBottom: 'var(--spacing-2xl)',
            flexShrink: 0,
          }}
        >
          <CapsuleButton
            size="large"
            variant="primary"
            className="w-full"
            disabled={true}
            icon={
              <svg className="tf-cg-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          >
            提交中...
          </CapsuleButton>
        </div>
      </div>
    </div>
  );
}