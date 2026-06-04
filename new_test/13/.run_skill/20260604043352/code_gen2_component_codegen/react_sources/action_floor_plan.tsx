import React from 'react';

export default function ActionFloorPlan() {
  return (
    <div 
      data-component-id="action_floor_plan" 
      className="tf-cg-action-floor-plan"
    >
      <svg viewBox="64 64 896 896" width="14" height="14" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M512 64C323.2 64 170 217.2 170 406c0 255.6 342 546 342 546s342-290.4 342-546C854 217.2 700.8 64 512 64zm0 766c-88.4-80.2-282-274.4-282-424 0-155.8 126.2-282 282-282s282 126.2 282 282c0 149.6-193.6 343.8-282 424zm0-494c-61.9 0-112 50.1-112 112s50.1 112 112 112 112-50.1 112-112-50.1-112-112-112zm0 164c-28.7 0-52-23.3-52-52s23.3-52 52-52 52 23.3 52 52-23.3 52-52 52z" />
      </svg>
      <span className="font-body-s" style={{ color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>点位图</span>
    </div>
  );
}