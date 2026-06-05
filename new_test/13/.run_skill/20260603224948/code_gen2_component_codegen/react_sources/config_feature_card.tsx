import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function ConfigFeatureCard() {
  return (
    <div
      data-component-id="config_feature_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 520,
        width: 336,
        height: 100,
      }}
    >
      <SectionLayout variant="card" title="方案特色">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
            • 定制化行业解决方案
          </span>
          <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
            • 全流程数字化管理支持
          </span>
        </div>
      </SectionLayout>
    </div>
  );
}