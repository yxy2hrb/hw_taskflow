import React from 'react';
import { CapsuleButton } from '@/components/ui/Button';

export default function GoToListBtn() {
  return (
    <div
      data-component-id="go_to_list_btn"
      className="tf-cg-go-to-list-btn-wrapper"
    >
      <CapsuleButton variant="primary" size="large" className="tf-cg-go-to-list-btn">
        去配单
      </CapsuleButton>
    </div>
  );
}