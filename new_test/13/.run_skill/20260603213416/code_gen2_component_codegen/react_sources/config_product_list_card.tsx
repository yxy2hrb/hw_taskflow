import React from 'react'
import SectionLayout from '@/components/SectionLayout'

const products = [
  { name: '华为智慧屏 V75 Pro', quantity: 2, price: 12999 },
  { name: '华为Sound X 音箱', quantity: 4, price: 2999 },
]

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_product_list_card" style={{ position: 'absolute', left: 0, top: 396, width: 360, height: 200 }}>
      <SectionLayout variant="card" title="产品清单">
        {/* 表头 */}
        <div className="flex items-center" style={{ paddingBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--color-divider-subtle)' }}>
          <span className="flex-1 font-body-s" style={{ color: 'var(--color-text-muted)' }}>已选产品信息</span>
          <span className="font-body-s" style={{ color: 'var(--color-text-muted)', width: 48, textAlign: 'center' }}>数量</span>
          <span className="font-body-s" style={{ color: 'var(--color-text-muted)', width: 64, textAlign: 'right' }}>单价</span>
          <span className="font-body-s" style={{ color: 'var(--color-text-muted)', width: 40, textAlign: 'center' }}>编辑</span>
        </div>
        {/* 产品行 */}
        {products.map((product, index) => (
          <div
            key={index}
            className="flex items-center"
            style={{
              padding: 'var(--spacing-md) 0',
              borderBottom: index < products.length - 1 ? '1px solid var(--color-divider-faint)' : 'none',
            }}
          >
            <div className="flex-1 flex items-center" style={{ gap: 'var(--spacing-md)', minWidth: 0 }}>
              <div
                className="rounded-[var(--radius-xxs)] flex-shrink-0 flex items-center justify-center"
                style={{ width: 36, height: 36, backgroundColor: 'var(--color-bg-disabled)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <span className="font-body-s truncate" style={{ color: 'var(--color-text-primary)' }}>{product.name}</span>
            </div>
            <span className="font-body-s" style={{ color: 'var(--color-text-primary)', width: 48, textAlign: 'center' }}>×{product.quantity}</span>
            <span className="font-body-s" style={{ color: 'var(--color-text-primary)', width: 64, textAlign: 'right' }}>¥{product.price.toLocaleString()}</span>
            <button
              className="bg-transparent border-none cursor-pointer"
              style={{ width: 40, textAlign: 'center', padding: 0 }}
              onClick={() => {}}
            >
              <span className="font-body-s" style={{ color: 'var(--color-primary)' }}>编辑</span>
            </button>
          </div>
        ))}
      </SectionLayout>
    </div>
  )
}