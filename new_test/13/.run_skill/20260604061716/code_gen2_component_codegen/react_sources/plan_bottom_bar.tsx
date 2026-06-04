import React from 'react';

export default function BottomActionBar() {
  return (
    <div className="tf-cg-bottom-bar" data-component-id="plan_bottom_bar">
      <div className="tf-cg-bottom-bar__left">
        <button className="tf-cg-bottom-bar__action" onClick={() => {}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>点位图</span>
        </button>
        <button className="tf-cg-bottom-bar__action" onClick={() => {}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>采购咨询</span>
        </button>
      </div>
      <div className="tf-cg-bottom-bar__right">
        <button className="tf-cg-bottom-bar__primary" onClick={() => {}}>导出</button>
      </div>
    </div>
  );
}