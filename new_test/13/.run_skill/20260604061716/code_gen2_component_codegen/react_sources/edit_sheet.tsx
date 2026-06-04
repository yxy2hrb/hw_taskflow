import React from 'react';

export default function EditSheet() {
  return (
    <div data-component-id="edit_sheet" className="tf-cg-sheet-root" style={{ zIndex: 70 }}>
      <div className="tf-cg-sheet-mask" />
      <div className="tf-cg-sheet-container">
        <div className="tf-cg-sheet-header">
          <span className="tf-cg-sheet-title font-headline-s">编辑配单信息</span>
          <button className="tf-cg-sheet-close" onClick={() => {}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="tf-cg-sheet-body">
          <div className="tf-cg-input-group">
            <label className="tf-cg-input-label font-body-m">配单名称</label>
            <input 
              type="text" 
              className="tf-cg-input font-body-m tf-cg-input-disabled" 
              placeholder="请输入配单名称" 
              disabled
            />
          </div>
        </div>
        <div className="tf-cg-sheet-footer">
          <button className="tf-cg-btn-primary tf-cg-btn-loading font-headline-s" disabled>
            <span className="tf-cg-spinner"></span>
            提交中...
          </button>
        </div>
      </div>
    </div>
  );
}