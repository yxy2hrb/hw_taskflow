import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  return (
    <div data-component-id="detail_info_card" style={{ position: 'absolute', left: 0, top: 332, width: 360, height: 200 }}>
      <div style={{ padding: '0 var(--spacing-xl)' }}>
        <SectionLayout variant="card" title="产品信息">
          {/* 产品名称 + 价格 */}
          <div className="flex items-center justify-between">
            <span className="font-headline-xs" style={{ color: 'var(--color-text-primary)' }}>
              HUAWEI Mate 80 Pro
            </span>
            <span className="font-headline-s" style={{ color: 'var(--color-primary)' }}>
              ¥5,999
            </span>
          </div>

          {/* 部件编码 + 厂商（双列） */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>编码</span>
              <span className="font-caption-m truncate" style={{ color: 'var(--color-text-primary)' }}>HW-M80P-256</span>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>厂商</span>
              <span className="font-caption-m truncate" style={{ color: 'var(--color-text-primary)' }}>华为技术</span>
            </div>
          </div>

          {/* 核心参数 */}
          <div className="flex items-center justify-between">
            <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>核心参数</span>
            <span className="font-caption-m" style={{ color: 'var(--color-text-primary)' }}>麒麟9030 / 12+256GB</span>
          </div>

          {/* 描述 + 相关配件 */}
          <div className="flex items-center justify-between">
            <span
              className="font-caption-s"
              style={{
                color: 'var(--color-text-muted)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginRight: 'var(--spacing-md)',
              }}
            >
              超感知徕卡影像系统，支持卫星通信
            </span>
            <span className="font-caption-m" style={{ color: 'var(--color-primary)', flexShrink: 0, cursor: 'pointer' }}>
              相关配件 ›
            </span>
          </div>
        </SectionLayout>
      </div>
    </div>
  );
}