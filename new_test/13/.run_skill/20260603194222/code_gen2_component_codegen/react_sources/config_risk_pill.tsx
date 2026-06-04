import React from 'react';
import StatusPill from '@/components/StatusPill';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="config_risk_pill" 
      style={{ 
        position: 'absolute', 
        left: 16, 
        top: 240, 
        width: 120, 
        height: 24,
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <StatusPill 
        text="缺少关键设备" 
        colorMap={{
          '缺少关键设备': { color: 'var(--color-warning)', bgColor: 'rgba(249, 115, 22, 0.1)' }
        }} 
      />
    </div>
  );
}