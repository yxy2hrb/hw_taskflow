import React from 'react'
import SectionLayout from '@/components/SectionLayout'

const products = [
  { name: '华为智慧屏 V75 Pro', spec: '75英寸 / 黑色', qty: 2, price: 15999 },
  { name: '华为全屋智能主机 SE', spec: '标准版', qty: 1, price: 9999 },
  { name: '华为智能门锁 Pro', spec: '星际黑', qty: 1, price: 3999 },
]

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_product_card"
      style={{ position: 'absolute', left: 16, top: 420, width: 328, height: 200 }}
    >
      <SectionLayout variant="card" title="产品清单">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {products.map((p, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0" style={{ flex: 1 }}>
                  <span
                    className="font-headline-xxs truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {p.name}
                  </span>
                  <span
                    className="font-caption-s"
                    style={{ color: 'var(--color-text-muted)', marginTop: 2 }}
                  >
                    {p.spec} × {p.qty}
                  </span>
                </div>
                <span
                  className="font-headline-xxs flex-shrink-0"
                  style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-md)' }}
                >
                  ¥{p.price.toLocaleString()}
                </span>
              </div>
              {i < products.length - 1 && (
                <div
                  style={{
                    height: 1,
                    backgroundColor: 'var(--color-divider-subtle)',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </SectionLayout>
    </div>
  )
}