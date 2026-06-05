import React from 'react'
import InputDemo from '@/components/InputDemo'
import { CapsuleButton } from '@/components/ui/Button'

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="sheet_edit"
      style={{
        position: 'absolute',
        left: 0,
        top: 828,
        width: 360,
        height: 340,
        zIndex: 70,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 顶部拖拽指示条 */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-bg-disabled)',
          }}
        />
      </div>

      {/* 标题行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-lg) var(--spacing-xl) 0',
          height: 48,
        }}
      >
        <span
          className="font-headline-s"
          style={{ color: 'var(--color-text-primary)' }}
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
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-text-muted)',
          }}
          onClick={() => {}}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 分割线 */}
      <div
        style={{
          height: 1,
          backgroundColor: 'var(--color-divider-subtle)',
          margin: 'var(--spacing-lg) var(--spacing-xl) 0',
        }}
      />

      {/* 内容区 */}
      <div
        style={{
          flex: 1,
          padding: 'var(--spacing-2xl) var(--spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2xl)',
        }}
      >
        <InputDemo
          label="配单名称"
          placeholder="请输入配单名称"
        />
      </div>

      {/* 底部按钮区 */}
      <div
        style={{
          padding: '0 var(--spacing-xl) var(--spacing-2xl)',
        }}
      >
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
  )
}