import React from 'react';

export default function SheetOverlay() {
  return (
    <div
      data-component-id="sheet_overlay_1"
      className="tf-cg-overlay"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 1360,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    />
  );
}