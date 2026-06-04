import React from 'react';
import EntryCard from '@/components/EntryCard';

export default function GeneratedComponent() {
  const card = {
    id: 'acc',
    title: '推荐配件',
    subtitle: '查看相关配件',
    color: '#1677FF',
    bgColor: '#E6F4FF',
    iconBg: '#BAE0FF',
  };

  return (
    <div
      data-component-id="entry_accessory"
      style={{
        position: 'absolute',
        left: 101,
        top: 686,
        width: 158,
        height: 58,
        zIndex: 1,
      }}
    >
      <EntryCard card={card} width={158} height={58} />
    </div>
  );
}