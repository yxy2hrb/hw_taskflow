import React from 'react';

export default function GeneratedComponent() {
  return (
    <div data-component-id="plan_sheet" style={{ zIndex: 60 }} className="tf-cg-bottomsheet-root">
      <div className="tf-cg-backdrop" />
      <div className="tf-cg-sheet">
        <div className="tf-cg-header">
          <span className="font-headline-m">产品清单</span>
          <div className="tf-cg-header-actions">
            <span className="font-body-m tf-cg-clear">全部清空</span>
            <button className="tf-cg-close" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="tf-cg-body">
          <div className="tf-cg-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span className="font-body-s">风险提示：当前方案可能缺少关键设备</span>
          </div>

          <div className="tf-cg-product">
            <div className="tf-cg-product-img" />
            <div className="tf-cg-product-info">
              <span className="font-body-m tf-cg-product-name">IdeaHub B2 Base-75寸</span>
              <div className="tf-cg-product-bottom">
                <span className="font-headline-xs tf-cg-product-price">¥21,999</span>
                <span className="font-body-s tf-cg-product-qty">x1</span>
              </div>
            </div>
          </div>

          <div className="tf-cg-entry">
            <div className="tf-cg-entry-text">
              <span className="font-body-m">推荐配件</span>
              <span className="font-body-s tf-cg-entry-sub">查看相关配件</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        <div className="tf-cg-footer">
          <span className="font-headline-m tf-cg-total">合计：¥21,999</span>
          <button className="tf-cg-primary-btn font-headline-s">去配单</button>
        </div>
      </div>
    </div>
  );
}