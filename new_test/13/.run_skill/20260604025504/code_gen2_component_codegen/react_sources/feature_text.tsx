import React from 'react';

export default function FeatureText() {
  return (
    <div
      data-component-id="feature_text"
      style={{
        position: 'absolute',
        left: 24,
        top: 692,
        width: 312,
        height: 60,
      }}
    >
      <p
        className="font-body-m"
        style={{
          fontSize: 'var(--font-body-14)',
          color: 'var(--color-text-secondary)',
          margin: 0,
        }}
      >
        提供1080P高清云会议体验，光学防蓝光，健康护眼，面向中小企业数字化办公。
      </p>
    </div>
  );
}