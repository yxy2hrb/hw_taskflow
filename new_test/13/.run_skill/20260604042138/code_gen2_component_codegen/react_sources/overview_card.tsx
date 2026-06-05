import React from 'react'
import SectionLayout from '@/components/SectionLayout'

export default function GeneratedComponent() {
  const headerAction = (
    <span 
      className="font-headline-xs" 
      style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
    >
      编辑
    </span>
  )

  return (
    <div 
      data-component-id="overview_card" 
      className="absolute"
      style={{ 
        left: 12, 
        top: 104, 
        width: 336, 
        height: 180 
      }}
    >
      <SectionLayout
        variant="card"
        title="配单概览"
        headerRightAction={headerAction}
      >
        <div className="grid grid-cols-3" style={{ gap: 'var(--spacing-md)' }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>房屋面积</span>
            <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>120㎡</span>
          </div>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>设备总数</span>
            <span className="font-headline-s" style={{ color: 'var(--color-text-primary)' }}>24件</span>
          </div>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span className="font-caption-m" style={{ color: 'var(--color-text-secondary)' }}>预计总价</span>
            <span className="font-headline-s" style={{ color: 'var(--color-primary)' }}>¥15.8万</span>
          </div>
        </div>
        <div 
          className="divider" 
          style={{ margin: 'var(--spacing-md) 0' }} 
        />
        <div className="flex items-center justify-between">
          <span className="font-body-m" style={{ color: 'var(--color-text-secondary)' }}>配单状态</span>
          <span className="font-body-m" style={{ color: 'var(--color-success)' }}>已完成</span>
        </div>
      </SectionLayout>
    </div>
  )
}