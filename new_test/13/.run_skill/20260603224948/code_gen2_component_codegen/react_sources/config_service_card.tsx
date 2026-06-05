import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="config_service_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 632,
        width: 336,
        height: 120,
      }}
    >
      <SectionLayout variant="card" title="服务商信息">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          {/* 服务商名称 */}
          <div className="flex items-center justify-between">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>
              服务商名称
            </span>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
              华为终端有限公司
            </span>
          </div>

          {/* 联系人 */}
          <div className="flex items-center justify-between">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>
              联系人
            </span>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
              张经理
            </span>
          </div>

          {/* 联系电话 */}
          <div className="flex items-center justify-between">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>
              联系电话
            </span>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
              138-0013-8000
            </span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}