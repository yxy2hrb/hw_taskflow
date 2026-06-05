import React from 'react';
import ButtonBar from '@/components/ButtonBar';

export default function GeneratedComponent() {
  return (
    <div 
      data-component-id="config_bottom_bar" 
      className="tf-cg-bottom-bar"
      style={{ 
        width: 360, 
        height: 64, 
        zIndex: 20,
        position: 'relative'
      }}
    >
      <ButtonBar
        variant="triple"
        primaryLabel="导出"
        secondaryLabel="采购咨询"
        thirdLabel="点位图"
        width={360}
      />
    </div>
  );
}