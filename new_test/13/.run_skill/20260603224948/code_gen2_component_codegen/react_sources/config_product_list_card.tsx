import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import { TextButton } from '@/components/ui/Button';

const products = [
  { id: '1', name: '华为MatePad Pro 12.6', qty: 2, price: 4999, color: '#C7000B' },
  { id: '2', name: '华为MateBook X Pro', qty: 1, price: 9999, color: '#FF8C42' },
];

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_product_list_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 348,
        width: 336,
        height: 160,
      }}
    >
      <SectionLayout
        variant="card"
        title="产品清单"
        headerRightAction={
          <TextButton size="small" variant="primary" onClick={() => {}}>
            编辑
          </TextButton>
        }
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          {products.map((p) => (
            <div key={p.id} className="flex items-center" style={{ gap: 'var(--spacing-lg)' }}>
              <div
                className="rounded-[var(--radius-xxs)] flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: `${p.color}15`,
                }}
              >
                <div
                  className="rounded-[var(--radius-xxs)]"
                  style={{ width: 20, height: 20, backgroundColor: p.color, opacity: 0.6 }}
                />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span
                  className="font-body-m truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {p.name}
                </span>
                <span
                  className="font-caption-m"
                  style={{ color: 'var(--color-text-muted)', marginTop: 2 }}
                >
                  ×{p.qty}
                </span>
              </div>
              <span
                className="font-headline-xxs flex-shrink-0"
                style={{ color: 'var(--color-text-primary)' }}
              >
                ¥{p.price.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </SectionLayout>
    </div>
  );
}