import React from 'react';

export default function ProductListSheet() {
  return (
    <div 
      data-component-id="product_list_sheet"
      className="tf-cg-sheet"
      style={{
        position: 'absolute',
        left: '0px',
        top: '544px',
        width: '360px',
        height: '816px',
        zIndex: 60,
        backgroundColor: 'var(--color-bg-card)',
        borderTopLeftRadius: 'var(--radius-2xl)',
        borderTopRightRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="tf-cg-sheet-header flex-between" style={{
        padding: '16px 16px 12px 16px',
        borderBottom: '1px solid var(--color-divider-subtle)'
      }}>
        <div className="font-headline-m" style={{ color: 'var(--color-text-primary)' }}>
          产品清单
        </div>
        <div className="flex-center" style={{ gap: '12px' }}>
          <div className="font-body-m" style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>
            全部清空
          </div>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="tf-cg-sheet-body" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* 已选产品占位 */}
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--color-bg-hover)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-xxs)',
            backgroundColor: 'var(--color-bg-disabled)',
            flexShrink: 0
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-body-m truncate" style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              示例产品 A
            </div>
            <div className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>
              规格: 100g/件
            </div>
          </div>
          <div className="font-body-m" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
            ¥ 12.50
          </div>
        </div>

        {/* 风险提示 */}
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--color-primary-soft)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: '2px', flexShrink: 0 }}>
            <path d="M8 1.33333L14.6667 13.3333H1.33333L8 1.33333Z" stroke="var(--color-warning)" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M8 6V9.33333M8 11.3333H8.00667" stroke="var(--color-warning)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <div className="font-caption-m" style={{ color: 'var(--color-warning)', lineHeight: '1.5' }}>
            部分产品库存不足，可能影响最终配单结果，请确认后再提交。
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="tf-cg-sheet-footer" style={{
        padding: '12px 16px 24px 16px',
        borderTop: '1px solid var(--color-divider-subtle)',
        backgroundColor: 'var(--color-bg-card)'
      }}>
        <button className="font-headline-s" style={{
          width: '100%',
          height: '44px',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-text-white)',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: 'pointer'
        }}>
          去配单
        </button>
      </div>
    </div>
  );
}