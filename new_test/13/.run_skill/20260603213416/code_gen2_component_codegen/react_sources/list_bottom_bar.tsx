import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function ListBottomBar() {
  return (
    <div
      data-component-id="list_bottom_bar"
      className="tf-cg-bottom-bar"
      style={{
        position: 'absolute',
        left: 0,
        top: 872,
        width: 360,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border-subtle)',
        boxSizing: 'border-box',
      }}
    >
      {/* 左侧：合计金额 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          className="font-body-m"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          合计
        </span>
        <span
          className="font-headline-l"
          style={{ color: 'var(--color-primary)' }}
        >
          ¥
        </span>
        <span
          className="font-headline-xxl"
          style={{ color: 'var(--color-primary)' }}
        >
          12,680
        </span>
      </div>

      {/* 右侧：去配单按钮 */}
      <CapsuleButton
        size="large"
        variant="primary"
        onClick={() => {}}
      >
        去配单
      </CapsuleButton>
    </div>
  );
}