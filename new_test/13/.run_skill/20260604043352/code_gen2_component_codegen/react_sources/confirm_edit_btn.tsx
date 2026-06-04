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
      <CapsuleButton variant="primary" size="large" disabled className="w-full">
        提交中...
      </CapsuleButton>
    </div>
  );
}