import React from 'react';
import SectionLayout from '@/components/SectionLayout';
import Child_after_policy from './after_policy';
import Child_after_scope from './after_scope';
import Child_after_response from './after_response';

export default function GeneratedComponent() {
  return (
    <div data-component-id="aftersale_info_card">
      <SectionLayout variant="card" title="售后信息">
        <div className="tf-cg-aftersale-list">
          <div className="tf-cg-aftersale-item">
            <div className="tf-cg-aftersale-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <Child_after_policy />
          </div>
          <div className="tf-cg-aftersale-divider" />
          <div className="tf-cg-aftersale-item">
            <div className="tf-cg-aftersale-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <Child_after_scope />
          </div>
          <div className="tf-cg-aftersale-divider" />
          <div className="tf-cg-aftersale-item">
            <div className="tf-cg-aftersale-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <Child_after_response />
          </div>
        </div>
      </SectionLayout>
    </div>
  );
}