import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function EditConfigSheet() {
  return (
    <div 
      data-component-id="edit_config_sheet" 
      style={{
        position: 'absolute',
        left: 0,
        top: 655,
        width: 360,
        height: 281,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: 'var(--spacing-xl)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative', 
        height: 56,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 'var(--font-headline-16)',
          lineHeight: 'var(--line-height-20)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-primary)',
        }}>
          编辑配单信息
        </span>
        <button style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-secondary)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '0 var(--spacing-xl)', flex: 1 }}>
        <label style={{
          display: 'block',
          fontSize: 'var(--font-caption-12)',
          lineHeight: 'var(--line-height-16)',
          fontWeight: 'var(--font-weight-regular)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--spacing-md)',
        }}>
          配单名称
        </label>
        <input 
          type="text" 
          value="默认配单" 
          disabled
          placeholder="请输入配单名称"
          style={{
            width: '100%',
            height: 40,
            padding: '10px 12px',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-disabled)',
            fontSize: 'var(--font-body-14)',
            lineHeight: 'var(--line-height-18)',
            color: 'var(--color-text-muted)',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            cursor: 'not-allowed',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ padding: 'var(--spacing-xl)', flexShrink: 0 }}>
        <CapsuleButton 
          size="large" 
          variant="primary" 
          className="w-full" 
          disabled={true}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'tf-cg-spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          }
        >
          确定
        </CapsuleButton>
      </div>
    </div>
  );
}