import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function ConfirmEditBtn() {
  return (
    <div
      data-component-id="confirm_edit_btn"
      style={{
        position: 'absolute',
        left: 16,
        top: 1276,
        width: 328,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CapsuleButton 
        variant="primary" 
        size="large" 
        className="w-full" 
        disabled={true}
      >
        <span className="tf-cg-loading-content">
          <svg className="tf-cg-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
          提交中...
        </span>
      </CapsuleButton>
    </div>
  );
}