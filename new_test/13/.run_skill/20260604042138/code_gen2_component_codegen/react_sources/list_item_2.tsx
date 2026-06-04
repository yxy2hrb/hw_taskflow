import React from 'react';

const HuaweiLogo = ({ size = 42 }) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: 'var(--color-primary)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <span
      style={{
        color: 'var(--color-text-white)',
        lineHeight: 1,
        fontSize: size * 0.42,
        fontWeight: 500
      }}
    >
      H
    </span>
  </div>
);

const statusColor = {
  '谈单中': 'var(--color-warning)',
  '已成单': 'var(--color-success)',
  '未成单': 'var(--color-text-muted)',
};

const statusBg = {
  '谈单中': 'rgba(249, 115, 22, 0.1)',
  '已成单': 'rgba(16, 185, 129, 0.1)',
  '未成单': 'rgba(156, 163, 175, 0.1)',
};

export default function GeneratedComponent() {
  const item = {
    id: "p2",
    name: "IdeaShare KEY (Type-A)",
    status: "谈单中",
    time: "¥1,999.00 x 2"
  };

  return (
    <div 
      data-component-id="list_item_2" 
      style={{
        position: 'absolute',
        left: 24,
        top: 499,
        width: 312,
        height: 59,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', height: 46 }}>
        <div style={{ marginTop: 4, marginRight: 12, flexShrink: 0 }}>
          <HuaweiLogo size={42} />
        </div>
        <div style={{ flex: 1, minWidth: 0, height: 46, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span 
              className="font-headline-xs truncate" 
              style={{ color: 'var(--color-text-primary)' }}
            >
              {item.name}
            </span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
              <button style={{ width: 24, height: 24, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
              </button>
              <button style={{ width: 24, height: 24, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span 
              className="font-caption-s" 
              style={{
                color: statusColor[item.status],
                backgroundColor: statusBg[item.status],
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0
              }}
            >
              {item.status}
            </span>
            <span 
              className="font-caption-s truncate" 
              style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }}
            >
              {item.time}
            </span>
          </div>
        </div>
      </div>
      <div style={{ height: 12 }} />
      <div
        style={{
          height: 1,
          backgroundColor: 'var(--color-bg-disabled)',
          marginLeft: 54,
        }}
      />
    </div>
  );
}