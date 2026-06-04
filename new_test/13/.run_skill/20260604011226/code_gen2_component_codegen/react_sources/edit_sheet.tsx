import React from 'react';

export default function GeneratedComponent() {
  const noop = () => {};

  return (
    <div
      data-component-id="edit_sheet"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 360,
        height: 936,
        zIndex: 70,
      }}
    >
      {/* Mask overlay */}
      <div
        className="tf-cg-mask"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: 600,
          backgroundColor: 'var(--color-mask)',
        }}
      />

      {/* Bottom Sheet Panel */}
      <div
        className="tf-cg-sheet"
        style={{
          position: 'absolute',
          left: 0,
          top: 600,
          width: 360,
          height: 336,
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header: Title + Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-headline-16)',
              lineHeight: 'var(--line-height-20)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            编辑配单信息
          </span>
          <button
            onClick={noop}
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--color-text-muted)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body: Input Field */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: 14,
              fontFamily: 'HarmonyOS Sans SC, sans-serif',
              fontWeight: 500,
              lineHeight: '20px',
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            配单名称
          </label>
          <input
            type="text"
            placeholder="请输入配单名称"
            disabled
            style={{
              width: '100%',
              height: 40,
              padding: '10px 0',
              border: 'none',
              borderBottom: '1px solid var(--color-border-subtle)',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 16,
              fontFamily: 'HarmonyOS Sans SC, sans-serif',
              lineHeight: '20px',
              caretColor: 'var(--color-primary)',
              color: 'var(--color-text-disabled)',
              boxSizing: 'border-box',
              cursor: 'not-allowed',
            }}
          />
        </div>

        {/* Footer: Confirm Button */}
        <div
          style={{
            marginTop: 24,
            flexShrink: 0,
          }}
        >
          <button
            onClick={noop}
            disabled
            style={{
              width: '100%',
              height: 40,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-white)',
              fontSize: 16,
              fontFamily: 'HarmonyOS Sans SC, sans-serif',
              fontWeight: 500,
              lineHeight: '20px',
              border: 'none',
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: 0.8,
            }}
          >
            <svg className="tf-cg-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
            </svg>
            提交中...
          </button>
        </div>
      </div>
    </div>
  );
}