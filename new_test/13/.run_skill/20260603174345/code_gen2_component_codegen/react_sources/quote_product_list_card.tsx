import React from 'react';
import SectionTitle from '@/components/SectionTitle';

export default function GeneratedComponent() {
  const products = [
    { id: '1', name: '华为 IdeaHub S2 65寸', spec: '智能协作终端', qty: 2, price: 29800 },
    { id: '2', name: '华为 AP6050DN 无线AP', spec: 'Wi-Fi 6 吸顶式', qty: 8, price: 1680 },
    { id: '3', name: '华为 S5735-L24T4S 交换机', spec: '24口千兆管理型', qty: 1, price: 4200 },
  ];

  return (
    <div
      data-component-id="quote_product_list_card"
      className="tf-cg-product-list-card"
      style={{
        position: 'absolute',
        left: 16,
        top: 328,
        width: 328,
        height: 200,
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <SectionTitle variant="card" title="产品清单" onMore={() => {}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)', flex: 1, overflow: 'hidden' }}>
        {products.map((p, idx) => (
          <React.Fragment key={p.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-disabled)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a4 4 0 00-8 0v2" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="font-headline-xxs" style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>{p.spec}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <span className="font-headline-xxs" style={{ color: 'var(--color-primary)' }}>¥{p.price.toLocaleString()}</span>
                <span className="font-caption-s" style={{ color: 'var(--color-text-muted)' }}>×{p.qty}</span>
              </div>
            </div>
            {idx < products.length - 1 && (
              <div style={{ height: 1, backgroundColor: 'var(--color-divider-subtle)', marginLeft: 52 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}