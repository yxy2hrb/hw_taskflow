import React from 'react';

export default function BottomActionBar() {
  return (
    <div 
      data-component-id="detail_bottom_action_bar_2" 
      className="tf-cg-bottom-bar"
      style={{ zIndex: 40 }}
    >
      <div className="tf-cg-action-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>客服</span>
      </div>
      <div className="tf-cg-action-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span>分享</span>
      </div>
      <button className="tf-cg-primary-btn font-headline-s">
        确认方案
      </button>
    </div>
  );
}