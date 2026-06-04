import React from 'react'
import SectionLayout from '@/components/SectionLayout'

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_service_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 752,
        width: 336,
        height: 140,
      }}
    >
      <SectionLayout variant="card" title="服务商信息">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              className="font-headline-xs"
              style={{ color: 'var(--color-text-white)', lineHeight: 1 }}
            >
              H
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="font-headline-xs truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              华为终端有限公司
            </div>
            <div
              className="font-caption-m"
              style={{ color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}
            >
              认证服务商 · 5年合作
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  )
}