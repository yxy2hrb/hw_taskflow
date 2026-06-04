import React from 'react';
import { TextButton } from '@/components/ui/Button';

const RightIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default function GeneratedComponent() {
  return (
    <div data-component-id="prod_accessories_btn" className="tf-cg-accessories-btn">
      <TextButton variant="primary" icon={<RightIcon />}>
        查看相关配件
      </TextButton>
    </div>
  );
}