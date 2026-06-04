import React from 'react';

export default function DetailBottomActionBar() {
  return (
    <div
      data-component-id="detail_bottom_action_bar"
      className="tf-cg-bottom-bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 1296,
        width: 360,
        height: 64,
        zIndex: 40,
        backgroundColor: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border-subtle)',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        boxSizing: 'border-box'
      }}
    />
  );
}