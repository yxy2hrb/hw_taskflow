import React from 'react'
import SectionLayout from '@/components/SectionLayout'

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_overview_card" style={{ position: 'absolute', left: 12, top: 104, width: 336, height: 140 }}>
      <SectionLayout variant="card" title="配单概览">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* 配单名称 + 编辑入口 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>华为智慧办公方案</span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, padding: 0 }}
              onClick={() => {}}
            >
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>编辑</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)' }}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          {/* 客户类型 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>客户类型</span>
            <span className="font-body-s" style={{ color: 'var(--color-text-primary)' }}>企业客户</span>
          </div>
          {/* 总报价 + 总成本价 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>总报价</span>
              <span className="font-headline-s" style={{ color: 'var(--color-primary)' }}>¥128,000</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>总成本价</span>
              <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>¥96,500</span>
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  )
}