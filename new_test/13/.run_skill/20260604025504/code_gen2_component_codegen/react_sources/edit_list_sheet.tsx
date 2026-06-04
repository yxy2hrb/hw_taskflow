import React from 'react';

export default function EditListSheet() {
  return (
    <div data-component-id="edit_list_sheet" className="tf-cg-sheet" style={{ zIndex: 70 }}>
      <div className="tf-cg-sheet-header">
        <span className="tf-cg-sheet-title">编辑配单信息</span>
        <div className="tf-cg-sheet-close" onClick={() => {}}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div className="tf-cg-sheet-body">
        <label className="tf-cg-label">配单名称</label>
        <input className="tf-cg-input" placeholder="请输入配单名称" />
      </div>
    </div>
  );
}