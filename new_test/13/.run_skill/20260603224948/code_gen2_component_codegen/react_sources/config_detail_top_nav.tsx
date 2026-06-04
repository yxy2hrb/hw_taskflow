import React from 'react';
import { Bell } from 'lucide-react';

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_detail_top_nav" className="tf-cg-topnav">
      <div className="tf-cg-topnav-left">
        <button className="tf-cg-topnav-back" onClick={() => {}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="font-headline-s truncate" style={{ color: 'var(--color-text-primary)' }}>
          配单详情
        </div>
      </div>
      <div className="tf-cg-topnav-right">
        <button className="tf-cg-topnav-action" onClick={() => {}}>
          <Bell size={24} />
        </button>
      </div>
    </div>
  );
}