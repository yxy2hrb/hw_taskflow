import React from 'react';

export default function EditSheet() {
  return (
    <div data-component-id="edit_sheet" className="tf-cg-sheet-overlay" style={{ zIndex: 70 }}>
      <div className="tf-cg-sheet-mask" />
      <div className="tf-cg-sheet-container animate-slide-up">
        {/* Header */}
        <div className="tf-cg-sheet-header">
          <span className="tf-cg-sheet-title font-headline-s">编辑配单信息</span>
          <button className="tf-cg-sheet-close" onClick={() => {}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="tf-cg-sheet-divider" />

        {/* Body */}
        <div className="tf-cg-sheet-body">
          <label className="tf-cg-sheet-label font-body-m">配单名称</label>
          <div className="tf-cg-sheet-input-wrapper">
            <input
              type="text"
              className="tf-cg-sheet-input font-body-m"
              placeholder="请输入配单名称"
              readOnly
            />
          </div>
        </div>

        {/* Footer */}
        <div className="tf-cg-sheet-footer">
          <button className="tf-cg-sheet-btn-primary tf-cg-sheet-btn-loading font-headline-s" disabled>
            <svg className="tf-cg-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
              <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            提交中...
          </button>
        </div>
      </div>
    </div>
  );
}