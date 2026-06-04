import React from 'react';
import SectionLayout from '@/components/SectionLayout';

const infoItems = [
  {
    label: '型号',
    desc: '查看设备型号',
    color: '#C7000B',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 3h-8l-2 4h12l-2-4z" />
      </svg>
    ),
  },
  {
    label: '参数',
    desc: '详细规格参数',
    color: '#FF8C42',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: '售后',
    desc: '售后服务保障',
    color: '#10B981',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    label: '工具',
    desc: '配套工具推荐',
    color: '#3B82F6',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_info_cards"
      style={{
        position: 'absolute',
        left: 0,
        top: 452,
        width: 360,
        height: 420,
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
      }}
    >
      <SectionLayout variant="card" title="产品信息">
        <div
          className="tf-cg-info-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--spacing-md)',
          }}
        >
          {infoItems.map((item) => (
            <button
              key={item.label}
              className="tf-cg-info-item tap-scale"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-lg)',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-page)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div
                className="tf-cg-info-icon"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: `${item.color}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: item.color,
                }}
              >
                {item.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span
                  className="font-headline-xxs"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {item.label}
                </span>
                <span
                  className="font-caption-s truncate"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {item.desc}
                </span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-text-disabled)', marginLeft: 'auto', flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </SectionLayout>
    </div>
  );
}