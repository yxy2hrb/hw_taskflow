import React from 'react';
import TopNav from '@/components/TopNav';

export default function GeneratedComponent() {
  const noop = () => {};
  return (
    <div
      data-component-id="config_top_nav"
      style={{
        position: 'absolute',
        left: 0,
        top: 36,
        width: 360,
        height: 56,
      }}
    >
      <TopNav
        variant="title"
        title="配单详情"
        onBack={noop}
        actions={['grid']}
        onGrid={noop}
      />
    </div>
  );
}