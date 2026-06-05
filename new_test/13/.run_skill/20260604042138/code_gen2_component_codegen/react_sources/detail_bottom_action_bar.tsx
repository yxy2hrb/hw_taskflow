import React from 'react';

export default function BottomActionBar() {
  return (
    <div
      data-component-id="detail_bottom_action_bar"
      className="tf-cg-bottom-bar"
      style={{ zIndex: 40 }}
    >
      <div className="tf-cg-actions-left">
        <div className="tf-cg-action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span>客服</span>
        </div>
        <div className="tf-cg-action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span>收藏</span>
        </div>
        <div className="tf-cg-action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <span>购物车</span>
        </div>
      </div>
      <div className="tf-cg-actions-right">
        <button className="tf-cg-btn-secondary">加入购物车</button>
        <button className="tf-cg-btn-primary">立即购买</button>
      </div>
    </div>
  );
}