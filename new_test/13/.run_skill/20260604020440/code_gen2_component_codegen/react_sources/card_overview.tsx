import React from 'react';
import SectionLayout from '@/components/SectionLayout';

export default function GeneratedComponent() {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 'var(--font-body-14)',
    lineHeight: '22px',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--color-text-secondary)',
  };

  const valueStyle: React.CSSProperties = {
    color: 'var(--color-text-primary)',
  };

  return (
    <div 
      data-component-id="card_overview" 
      style={{ 
        position: 'absolute', 
        left: 12, 
        top: 104, 
        width: 336, 
        height: 160,
      }}
    >
      <SectionLayout variant="card" title="配单概览">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
          <div style={rowStyle}>
            <span style={labelStyle}>配单名称</span>
            <span style={valueStyle}>华为会议室方案</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>客户类型</span>
            <span style={valueStyle}>企业</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>总报价</span>
            <span style={{ ...valueStyle, color: 'var(--color-primary)', fontWeight: 500 }}>¥45,000</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>总成本价</span>
            <span style={valueStyle}>¥38,000</span>
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}