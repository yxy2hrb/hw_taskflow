import React from 'react'
import SectionLayout from '@/components/SectionLayout'

export default function AfterSalesCard() {
  return (
    <div
      data-component-id="after_sales_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 776,
        width: 336,
        height: 160,
      }}
    >
      <SectionLayout variant="card" title="售后信息">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <div className="flex items-center" style={{ gap: 'var(--spacing-xl)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>7天无理由退货</span>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>正品保证</span>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 'var(--spacing-xl)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>极速退款</span>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>运费险</span>
            </div>
          </div>
          <div
            className="font-body-s"
            style={{
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--spacing-xs)',
              lineHeight: 'var(--line-height-18)',
            }}
          >
            本商品支持7天无理由退货，退货需保证商品完好。正品保证，假一赔十。
          </div>
        </div>
      </SectionLayout>
    </div>
  )
}