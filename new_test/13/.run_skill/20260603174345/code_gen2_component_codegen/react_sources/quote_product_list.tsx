import React, { useState } from 'react';

const initialProducts = [
  { id: 'p1', name: '华为智慧屏 V75 Pro', spec: '75英寸 / 星际蓝', price: 12999, qty: 1 },
  { id: 'p2', name: '华为Sound X 智能音箱', spec: '幻彩光影 / 帝瓦雷', price: 2999, qty: 2 },
  { id: 'p3', name: '华为全屋智能主机 SE', spec: '标准版 / 白色', price: 4999, qty: 1 },
  { id: 'p4', name: '华为智能门锁 Plus', spec: '星际黑 / 指纹+密码', price: 2499, qty: 1 },
];

const ProductIcon: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 48,
      height: 48,
      borderRadius: 'var(--radius-md)',
      backgroundColor: `${color}12`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a4 4 0 00-8 0v2" />
    </svg>
  </div>
);

const iconColors = ['#C7000B', '#FF8C42', '#3B82F6', '#10B981'];

export default function GeneratedComponent() {
  const [products, setProducts] = useState(initialProducts);

  const updateQty = (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p
      )
    );
  };

  return (
    <div
      data-component-id="quote_product_list"
      className="tf-cg-product-list"
      style={{
        position: 'absolute',
        left: 0,
        top: 340,
        width: 360,
        height: 300,
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
        {products.map((product, index) => (
          <div key={product.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                gap: 'var(--spacing-lg)',
              }}
            >
              {/* 产品图标 */}
              <ProductIcon color={iconColors[index % iconColors.length]} />

              {/* 产品信息 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  className="font-headline-xxs"
                  style={{
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.name}
                </span>
                <span
                  className="font-caption-s"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {product.spec}
                </span>
                <span
                  className="font-headline-xxs"
                  style={{ color: 'var(--color-primary)', marginTop: 2 }}
                >
                  ¥{product.price.toLocaleString()}
                </span>
              </div>

              {/* 数量步进器 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  flexShrink: 0,
                  backgroundColor: 'var(--color-bg-disabled)',
                  borderRadius: 'var(--radius-full)',
                  height: 28,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => updateQty(product.id, -1)}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: product.qty <= 1 ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: 'HarmonyOS Sans SC, sans-serif',
                  }}
                >
                  −
                </button>
                <span
                  className="font-body-m"
                  style={{
                    width: 28,
                    textAlign: 'center',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {product.qty}
                </span>
                <button
                  onClick={() => updateQty(product.id, 1)}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: 'HarmonyOS Sans SC, sans-serif',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* 分割线（最后一项不显示） */}
            {index < products.length - 1 && (
              <div
                style={{
                  height: 1,
                  backgroundColor: 'var(--color-divider-subtle)',
                  marginLeft: 60,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}