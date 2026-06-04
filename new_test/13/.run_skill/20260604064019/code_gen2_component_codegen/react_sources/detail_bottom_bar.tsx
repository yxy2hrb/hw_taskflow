import React from 'react';

const CompareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="18" rx="1.5" stroke="rgba(0,0,0,0.9)" strokeWidth="1.5" />
    <rect x="14" y="3" width="7" height="18" rx="1.5" stroke="rgba(0,0,0,0.9)" strokeWidth="1.5" />
    <line x1="5.5" y1="8" x2="7.5" y2="8" stroke="rgba(0,0,0,0.9)" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="5.5" y1="11" x2="7.5" y2="11" stroke="rgba(0,0,0,0.9)" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="16.5" y1="8" x2="18.5" y2="8" stroke="rgba(0,0,0,0.9)" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="16.5" y1="11" x2="18.5" y2="11" stroke="rgba(0,0,0,0.9)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const ConsultIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V14C20 15.1046 19.1046 16 18 16H8L4 20V5Z" stroke="rgba(0,0,0,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="9" cy="9.5" r="1" fill="rgba(0,0,0,0.9)" />
    <circle cx="12" cy="9.5" r="1" fill="rgba(0,0,0,0.9)" />
    <circle cx="15" cy="9.5" r="1" fill="rgba(0,0,0,0.9)" />
  </svg>
);

export default function DetailBottomBar() {
  return (
    <div
      data-component-id="detail_bottom_bar"
      className="tf-cg-bottom-bar"
      style={{ zIndex: 20 }}
    >
      <div className="tf-cg-bottom-bar__icons">
        <button className="tf-cg-bottom-bar__icon-btn tap-scale" onClick={() => {}}>
          <CompareIcon />
          <span className="tf-cg-bottom-bar__icon-label font-caption-s">对比</span>
        </button>
        <button className="tf-cg-bottom-bar__icon-btn tap-scale" onClick={() => {}}>
          <ConsultIcon />
          <span className="tf-cg-bottom-bar__icon-label font-caption-s">客服</span>
        </button>
      </div>
      <div className="tf-cg-bottom-bar__actions">
        <button className="tf-cg-bottom-bar__btn tf-cg-bottom-bar__btn--secondary tap-scale" onClick={() => {}}>
          <span className="font-headline-xs">加入采购单</span>
        </button>
        <button className="tf-cg-bottom-bar__btn tf-cg-bottom-bar__btn--primary tap-scale" onClick={() => {}}>
          <span className="font-headline-xs">加入配单</span>
        </button>
      </div>
    </div>
  );
}