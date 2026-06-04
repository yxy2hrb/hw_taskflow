import React from 'react';

export default function ProductListSheet() {
  return (
    <div 
      data-component-id="product_list_sheet" 
      className="tf-cg-sheet-root"
    >
      <div className="tf-cg-sheet-header">
        <div className="tf-cg-sheet-close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="var(--color-text-primary)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="tf-cg-sheet-title font-headline-s">产品清单</div>
        <div className="tf-cg-sheet-clear font-body-m">全部清空</div>
      </div>

      <div className="tf-cg-sheet-body">
        <div className="font-body-m" style={{ color: 'var(--color-text-muted)' }}>暂无已选产品</div>
      </div>

      <div className="tf-cg-sheet-footer">
        <button className="tf-cg-sheet-btn font-headline-s">
          去配单
        </button>
      </div>
    </div>
  );
}