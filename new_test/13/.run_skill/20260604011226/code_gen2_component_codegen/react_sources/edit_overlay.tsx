import React from 'react';

export default function EditOverlay() {
  return (
    <div
      data-component-id="edit_overlay"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 1176,
        zIndex: 65,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    />
  );
}