import React from 'react';

export default function OverlayMask() {
  return (
    <div
      data-component-id="overlay_mask"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 1244,
        zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
    />
  );
}