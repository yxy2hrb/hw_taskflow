import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="btn_confirm_edit"
      style={{
        position: 'absolute',
        left: 12,
        top: 1100,
        width: 336,
        height: 40,
      }}
    >
      <CapsuleButton 
        variant="primary" 
        size="large" 
        className="w-full" 
        disabled={true}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg className="tf-cg-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          提交中...
        </span>
      </CapsuleButton>
    </div>
  );
}