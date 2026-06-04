import React from 'react';
import IconGrid from '@/components/IconGrid';

const IconWrapper = ({ children, size = 24, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const Calculator = (props: any) => <IconWrapper {...props}><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></IconWrapper>;
const FileText = (props: any) => <IconWrapper {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></IconWrapper>;
const Tool = (props: any) => <IconWrapper {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></IconWrapper>;
const CustomerService = (props: any) => <IconWrapper {...props}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></IconWrapper>;

export default function ToolsGrid() {
  const items = [
    { icon: Calculator, label: '报价计算', color: '#1677ff' },
    { icon: FileText, label: '产品手册', color: '#52c41a' },
    { icon: Tool, label: '安装指导', color: '#faad14' },
    { icon: CustomerService, label: '售后报修', color: '#ff4d4f' },
  ];

  return (
    <div 
      data-component-id="tools_grid" 
      style={{ 
        position: 'absolute', 
        left: 24, 
        top: 960, 
        width: 312, 
        height: 100 
      }}
    >
      <IconGrid cols={4} variant="plain" items={items} />
    </div>
  );
}