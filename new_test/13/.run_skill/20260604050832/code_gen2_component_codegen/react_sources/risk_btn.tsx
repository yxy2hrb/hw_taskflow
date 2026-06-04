import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function RiskBtn() {
  return (
    <div data-component-id="risk_btn" style={{ display: 'inline-flex' }}>
      <CapsuleButton size="small" variant="secondary-primary">
        <span
          className="font-caption-m"
          style={{
            fontSize: 'var(--font-caption-12)',
            lineHeight: 'var(--line-height-16)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-primary)'
          }}
        >
          去添加
        </span>
      </CapsuleButton>
    </div>
  );
}