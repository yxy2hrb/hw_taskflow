import React from 'react';

export default function ProductParams() {
  return (
    <div
      data-component-id="product_params"
      style={{
        position: 'absolute',
        left: 24,
        top: 544,
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
          whiteSpace: 'pre-wrap',
        }}
      >
        部件编码：EOS | 厂商：华为
核心参数：1080P高清云会议，光学防蓝光
描述：面向中小企业数字化办公，投屏、书写全面升级
      </p>
    </div>
  );
}