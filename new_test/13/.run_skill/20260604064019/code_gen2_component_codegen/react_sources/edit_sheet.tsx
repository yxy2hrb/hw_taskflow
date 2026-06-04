import React from 'react';

export default function EditSheet() {
  return (
    <div data-component-id="edit_sheet" style={{ position: 'fixed', inset: 0, zIndex: 70, pointerEvents: 'auto' }}>
      <div className="tf-cg-mask" />
      <div className="tf-cg-sheet">
        <div className="tf-cg-header">
          <div className="tf-cg-title font-headline-s">编辑配单信息</div>
          <button className="tf-cg-close-btn" aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="tf-cg-body">
          <div className="tf-cg-field">
            <label className="tf-cg-label font-body-m">配单名称</label>
            <div className="tf-cg-input-wrapper">
              <input 
                type="text" 
                className="tf-cg-input font-body-m tf-cg-input-disabled" 
                placeholder="请输入配单名称" 
                defaultValue="我的配单" 
                disabled 
              />
            </div>
          </div>
        </div>
        <div className="tf-cg-footer">
          <button className="tf-cg-primary-btn font-headline-s tf-cg-btn-loading" disabled>
            <svg className="tf-cg-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            提交中...
          </button>
        </div>
      </div>
    </div>
  );
}