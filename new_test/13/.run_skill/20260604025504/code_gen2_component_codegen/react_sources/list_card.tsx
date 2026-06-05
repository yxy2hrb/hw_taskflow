import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="list_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 428,
        width: 336,
        height: 240,
      }}
    >
      <SectionLayout
        variant="card"
        title="产品清单"
        headerRightAction={
          <span
            className="font-body-m"
            style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            编辑
          </span>
        }
      >
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col" style={{ gap: 4 }}>
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
                云服务器 ECS
              </span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>
                2核4G / 50G SSD
              </span>
            </div>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
              ¥ 1,200.00
            </span>
          </div>
          <hr className="divider" />
          <div className="flex items-center justify-between">
            <div className="flex flex-col" style={{ gap: 4 }}>
              <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
                云数据库 RDS
              </span>
              <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>
                MySQL 8.0 / 高可用版
              </span>
            </div>
            <span className="font-body-m" style={{ color: 'var(--color-text-primary)' }}>
              ¥ 3,500.00
            </span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}