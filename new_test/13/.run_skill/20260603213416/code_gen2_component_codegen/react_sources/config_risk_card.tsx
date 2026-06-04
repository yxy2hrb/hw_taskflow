import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_risk_card" style={{ position: 'absolute', left: 0, top: 264, width: 360, height: 120 }}>
      <SectionLayout variant="card" title="风险提示">
        <div className="flex items-center" style={{ gap: 'var(--spacing-lg)', padding: 'var(--spacing-xs) 0' }}>
          {/* 警告图标 */}
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-[var(--radius-md)]"
            style={{ width: 36, height: 36, backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L1 21h22L12 2z"
                stroke="var(--color-warning)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <line x1="12" y1="9" x2="12" y2="13" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1" fill="var(--color-warning)" />
            </svg>
          </div>

          {/* 风险提示文字 */}
          <span
            className="font-body-m flex-1"
            style={{ color: 'var(--color-text-primary)', minWidth: 0 }}
          >
            缺少UPS、路由器等关键设备
          </span>

          {/* 去添加按钮 */}
          <button
            className="flex items-center bg-transparent border-none cursor-pointer flex-shrink-0"
            style={{ gap: 2, padding: 0 }}
            onClick={() => {}}
          >
            <span className="font-headline-xs" style={{ color: 'var(--color-primary)' }}>去添加</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-primary)' }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </SectionLayout>
    </div>
  );
}