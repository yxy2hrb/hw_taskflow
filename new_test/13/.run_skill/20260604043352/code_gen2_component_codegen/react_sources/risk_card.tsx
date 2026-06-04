import React from 'react'
import SectionLayout from '@/components/SectionLayout'

export default function RiskCard() {
  return (
    <div
      data-component-id="risk_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 296,
        width: 336,
        height: 120,
      }}
    >
      <SectionLayout variant="card" title="风险提示">
        <div
          style={{
            height: 52,
            backgroundColor: 'var(--color-bg-disabled)',
            borderRadius: 'var(--radius-md)',
          }}
        />
      </SectionLayout>
    </div>
  )
}