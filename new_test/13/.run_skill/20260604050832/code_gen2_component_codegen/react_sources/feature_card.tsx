import React from 'react'
import SectionLayout from '@/components/SectionLayout'
import Child_feat_text from './feat_text'

export default function FeatureCard() {
  return (
    <div 
      data-component-id="feature_card" 
      style={{ 
        position: 'absolute', 
        left: 12, 
        top: 680, 
        width: 336, 
        height: 160 
      }}
    >
      <SectionLayout variant="card" title="方案特色">
        <Child_feat_text />
      </SectionLayout>
    </div>
  )
}