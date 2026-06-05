import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_service_card"
      style={{
        position: 'absolute',
        left: 16,
        top: 772,
        width: 328,
        height: 140,
      }}
    >
      <SectionLayout variant="card" title="服务商信息">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: 'var(--color-text-white)',
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                华
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                className="font-headline-xs truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                华为终端有限公司
              </span>
              <span
                className="font-caption-m"
                style={{ color: 'var(--color-text-muted)' }}
              >
                金牌服务商 · 5年合作
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
                400-888-9999
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>
                深圳市龙岗区
              </span>
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}