import React from 'react';

export default function ProductListSheet() {
  return (
    <div 
      data-component-id="product_list_sheet" 
      className="tf-cg-sheet"
      style={{ left: 0, top: 544, width: 360, height: 816, zIndex: 60 }}
    >
      <div className="tf-cg-sheet-header">
        <div className="tf-cg-sheet-clear" onClick={() => {}}>全部清空</div>
        <div className="tf-cg-sheet-title">产品清单</div>
        <div className="tf-cg-sheet-close" onClick={() => {}}>
          <div className="tf-cg-sheet-close-icon">×</div>
        </div>
      </div>
      <div className="tf-cg-sheet-body" />
    </div>
  );
}