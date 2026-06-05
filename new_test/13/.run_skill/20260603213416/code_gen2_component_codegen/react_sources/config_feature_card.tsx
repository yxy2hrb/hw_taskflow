import React from 'react';
import SectionLayout from '@/components/SectionLayout';

const features = [
  { icon: '🎯', text: '精准匹配客户需求，提供定制化解决方案' },
  { icon: '🔧', text: '专业技术团队全程支持，确保交付质量' },
  { icon: '💰', text: '高性价比方案，优化客户投资回报' },
];

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_feature_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 608,
        width: 360,
        height: 120,
      }}
    >
      <SectionLayout variant="card" title="方案特色">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          {features.map((f, i) => (
            <div key={i} className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{f.icon}</span>
              <span
                className="font-body-s"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {f.text}
              </span>
            </div>
          ))}
        </div>
      </SectionLayout>
    </div>
  );
}