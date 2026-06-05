import React from 'react';

export default function SheetFooter() {
  return (
    <div data-component-id="sheet_footer" className="tf-cg-sheet-footer">
      <div className="tf-cg-footer-info">
        <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>已选 3 件产品</span>
        <span className="font-caption-s" style={{ color: 'var(--color-warning)' }}>部分产品存在库存风险</span>
      </div>
      <button className="tf-cg-footer-btn font-headline-s">
        去配单
      </button>
    </div>
  );
}