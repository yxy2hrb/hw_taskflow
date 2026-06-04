import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="config_bottom_bar" 
      style={{ 
        position: 'absolute', 
        left: 0, 
        top: 928, 
        width: 360, 
        height: 64, 
        backgroundColor: 'var(--color-bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ButtonBar
        variant="triple"
        primaryLabel="导出"
        secondaryLabel="采购咨询"
        thirdLabel="点位图"
      />
    </div>
  );
}