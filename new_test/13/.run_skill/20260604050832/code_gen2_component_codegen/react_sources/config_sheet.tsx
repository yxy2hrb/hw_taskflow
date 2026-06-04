import React from 'react';

export default function ConfigSheet() {
  return (
    <div data-component-id="config_sheet" className="tf-cg-sheet-overlay" style={{ zIndex: 60 }}>
      <div className="tf-cg-sheet-mask" />
      <div className="tf-cg-sheet-panel">
        <div className="tf-cg-sheet-header">
          <div className="tf-cg-sheet-title font-headline-s">产品清单</div>
          <div className="tf-cg-sheet-actions">
            <button className="tf-cg-sheet-clear font-body-m">全部清空</button>
            <button className="tf-cg-sheet-close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="tf-cg-sheet-body">
          <div className="tf-cg-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span className="font-body-m tf-cg-warning-text">风险提示：当前方案可能缺少关键设备</span>
          </div>

          <div className="tf-cg-product">
            <div className="tf-cg-product-info">
              <div className="tf-cg-product-name font-body-m">IdeaHub B2 Base-75寸</div>
              <div className="tf-cg-product-price font-headline-s">¥21,999</div>
            </div>
            <div className="tf-cg-product-qty font-body-m">x1</div>
          </div>

          <div className="tf-cg-entry">
            <div className="tf-cg-entry-info">
              <div className="tf-cg-entry-title font-body-m">推荐配件</div>
              <div className="tf-cg-entry-sub font-caption-m">查看相关配件</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        <div className="tf-cg-sheet-footer">
          <div className="tf-cg-footer-total">
            <span className="font-body-m tf-cg-footer-label">合计：</span>
            <span className="font-headline-m tf-cg-footer-price">¥21,999</span>
          </div>
          <button className="tf-cg-footer-btn font-headline-s">去配单</button>
        </div>
      </div>
    </div>
  );
}