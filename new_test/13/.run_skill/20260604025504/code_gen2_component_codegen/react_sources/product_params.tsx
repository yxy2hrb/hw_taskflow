import React from 'react';

export default function ProductParams() {
  return (
    <div
      data-component-id="product_params"
      className="tf-cg-product-params font-body-m"
      style={{
        position: 'absolute',
        left: 24,
        top: 544,
        width: 312,
        minHeight: 60,
        color: 'var(--color-text-secondary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
    >
      部件编码：EOS | 厂商：华为{'\n'}核心参数：1080P高清云会议，光学防蓝光{'\n'}描述：面向中小企业数字化办公，投屏、书写全面升级
    </div>
  );
}