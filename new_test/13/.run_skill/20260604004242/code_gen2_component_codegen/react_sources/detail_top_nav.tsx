import React from 'react';
import TopNav from '@/components/TopNav';

export default function GeneratedComponent() {
  const noop = () => {};
  return (
    <div
      data-component-id="detail_top_nav"
      style={{
        position: 'absolute',
        left: 0,
        top: 36,
        width: 360,
        height: 56,
        zIndex: 10,
      }}
    >
      <TopNav
        variant="title"
        onBack={noop}
        title="产品详情"
        actions={['cart', 'profile', 'grid']}
        cartCount={0}
        onCart={noop}
        onProfile={noop}
        onGrid={noop}
      />
    </div>
  );
}