import React from 'react';
import TopNav from '@/components/TopNav';

export default function GeneratedComponent() {
  const noop = () => {};
  return (
    <div 
      data-component-id="detail_top_nav" 
      className="tf-cg-detail-top-nav"
      style={{ 
        position: 'absolute', 
        left: 0, 
        top: 36, 
        width: 360, 
        height: 56 
      }}
    >
      <TopNav 
        variant="title" 
        title="产品详情" 
        onBack={noop} 
        actions={['cart', 'message']} 
        onCart={noop}
        onMessage={noop}
      />
    </div>
  );
}