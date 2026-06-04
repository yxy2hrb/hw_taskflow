import React from 'react';
import SectionLayout from '@/components/SectionLayout';

const infoRows = [
  { label: '名称/型号', value: '华为 MatePad Pro 13.2' },
  { label: '部件编码', value: 'HW-MP-2024-0892' },
  { label: '价格', value: '¥4,299', highlight: true },
  { label: '厂商', value: '华为技术有限公司' },
  { label: '核心参数', value: '13.2英寸 OLED / 麒麟9000S' },
  { label: '描述', value: '旗舰级平板电脑，支持手写笔与智能键盘' },
];

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="detail_info_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 404,
        width: 336,
        height: 180,
        zIndex: 1,
      }}
    >
      <SectionLayout variant="card" title="产品信息">
        <div className="tf-cg-info-rows" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {infoRows.map((row) => (
            <div key={row.label} className="tf-cg-info-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-lg)' }}>
              <span
                className="font-body-s"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0, width: 64 }}
              >
                {row.label}
              </span>
              <span
                className="font-body-s"
                style={{
                  color: row.highlight ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  textAlign: 'right',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
          {/* 相关配件入口 */}
          <div
            className="tf-cg-accessory-entry"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'var(--spacing-xs)',
              paddingTop: 'var(--spacing-md)',
              borderTop: '1px solid var(--color-divider-subtle)',
            }}
          >
            <span className="font-body-s" style={{ color: 'var(--color-text-muted)' }}>相关配件</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span className="font-body-s" style={{ color: 'var(--color-text-secondary)' }}>查看</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}