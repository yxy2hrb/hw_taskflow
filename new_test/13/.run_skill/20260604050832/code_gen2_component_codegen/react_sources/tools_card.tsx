import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_tools_grid from './tools_grid';

export default function ToolsCard() {
  return (
    <div 
      data-component-id="tools_card"
      style={{
        position: 'absolute',
        left: 12,
        top: 816,
        width: 336,
        height: 120
      }}
    >
      <SectionLayout variant="card" title="售前/售后工具">
        <Child_tools_grid 
          cols={4} 
          items={[
            { icon: "tool1", label: "配置工具", color: "#1890ff" }, 
            { icon: "tool2", label: "售后报修", color: "#52c41a" }
          ]} 
        />
      </SectionLayout>
    </div>
  );
}