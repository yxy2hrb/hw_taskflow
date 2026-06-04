import React from 'react';

export default function ProductListSheet() {
  return (
    <div 
      data-component-id="product_list_sheet" 
      className="tf-cg-sheet-overlay" 
      style={{ zIndex: 60 }}
    >
      <div className="tf-cg-sheet">
        <div className="tf-cg-sheet-header">
          <span className="font-headline-s">产品清单</span>
          <div className="tf-cg-sheet-header-actions">
            <span className="tf-cg-clear-text font-body-m">全部清空</span>
            <button className="tf-cg-close-btn" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="tf-cg-sheet-body">
          <div className="tf-cg-warning">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M8 6v3.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="font-body-s">风险提示：当前方案可能缺少关键设备</span>
          </div>

          <div className="tf-cg-product">
            <div className="tf-cg-product-info">
              <span className="font-body-m tf-cg-product-name">IdeaHub B2 Base-75寸</span>
              <span className="font-body-s tf-cg-product-qty">x1</span>
            </div>
            <span className="font-headline-xs tf-cg-product-price">¥21,999</span>
          </div>

          <div className="tf-cg-entry">
            <div className="tf-cg-entry-info">
              <span className="font-body-m">推荐配件</span>
              <span className="font-body-s tf-cg-entry-sub">查看相关配件</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="tf-cg-sheet-footer">
          <div className="tf-cg-total">
            <span className="font-body-m">合计：</span>
            <span className="font-headline-m tf-cg-total-price">¥21,999</span>
          </div>
          <button className="tf-cg-primary-btn font-headline-s">去配单</button>
        </div>
      </div>
    </div>
  );
}