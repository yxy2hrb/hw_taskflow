import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function GeneratedComponent() {
  return (
    <div
      data-component-id="icon_consult"
      style={{
        position: 'absolute',
        left: 84,
        top: 1116,
        width: 40,
        height: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <MessageCircle size={20} style={{ color: 'var(--color-text-secondary)' }} />
      <span
        className="font-caption-s"
        style={{
          fontSize: 'var(--font-caption-10)',
          color: 'var(--color-text-secondary)',
          lineHeight: '12px',
        }}
      >
        咨询
      </span>
    </div>
  );
}