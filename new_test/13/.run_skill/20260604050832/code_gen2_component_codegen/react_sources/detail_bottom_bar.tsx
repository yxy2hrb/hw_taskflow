import React from 'react';

export default function DetailBottomBar() {
  return (
    <div data-component-id="detail_bottom_bar" className="tf-cg-bottom-bar">
      <div className="tf-cg-bottom-bar-left">
        <div className="tf-cg-bottom-bar-action">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
          <span className="tf-cg-bottom-bar-action-label">产品对比</span>
        </div>
        <div className="tf-cg-bottom-bar-action">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span className="tf-cg-bottom-bar-action-label">咨询</span>
        </div>
      </div>
      <div className="tf-cg-bottom-bar-right">
        <button className="tf-cg-btn-secondary font-headline-s">加入采购单</button>
        <button className="tf-cg-btn-primary font-headline-s">加入配单</button>
      </div>
    </div>
  );
}