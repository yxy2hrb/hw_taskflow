import React from 'react';

export default function GeneratedComponent() {
  const specs = [
    { label: '品牌', value: '华为' },
    { label: '型号', value: 'Mate 60 Pro' },
    { label: '屏幕', value: '6.82英寸 OLED' },
    { label: '处理器', value: '麒麟9000S' },
    { label: '存储', value: '12GB+512GB' },
    { label: '电池', value: '5000mAh' },
  ];

  const services = [
    { icon: '🛡️', title: '正品保障', desc: '官方授权渠道' },
    { icon: '🔄', title: '7天退换', desc: '无忧售后服务' },
    { icon: '🚚', title: '免费配送', desc: '全国包邮到家' },
  ];

  return (
    <div
      data-component-id="detail_info_cards"
      className="tf-cg-detail-info-cards"
      style={{
        position: 'absolute',
        left: 0,
        top: 320,
        width: 360,
        height: 480,
        overflowY: 'auto',
        padding: '0 var(--spacing-xl)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
      }}
    >
      {/* 产品名称与型号卡片 */}
      <div
        className="tf-cg-card"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
        }}
      >
        <span
          className="font-headline-m"
          style={{ color: 'var(--color-text-primary)' }}
        >
          华为 Mate 60 Pro
        </span>
        <span
          className="font-body-s"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          型号：ALN-AL80 | 雅丹黑
        </span>
      </div>

      {/* 价格信息卡片 */}
      <div
        className="tf-cg-card"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--spacing-md)',
        }}
      >
        <span
          className="font-headline-xxl"
          style={{ color: 'var(--color-primary)' }}
        >
          ¥6,999
        </span>
        <span
          className="font-body-s"
          style={{
            color: 'var(--color-text-muted)',
            textDecoration: 'line-through',
          }}
        >
          ¥7,999
        </span>
        <span
          className="font-caption-s"
          style={{
            color: 'var(--color-primary)',
            backgroundColor: 'var(--color-primary-soft)',
            padding: '1px 8px',
            borderRadius: 'var(--radius-full)',
            marginLeft: 'auto',
          }}
        >
          限时优惠
        </span>
      </div>

      {/* 产品参数卡片 */}
      <div
        className="tf-cg-card"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-lg)',
        }}
      >
        <span
          className="font-headline-xs"
          style={{ color: 'var(--color-text-primary)' }}
        >
          产品参数
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-lg) var(--spacing-xl)',
          }}
        >
          {specs.map((spec) => (
            <div
              key={spec.label}
              style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span
                className="font-caption-m"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {spec.label}
              </span>
              <span
                className="font-body-s"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 售后服务卡片 */}
      <div
        className="tf-cg-card"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-lg)',
        }}
      >
        <span
          className="font-headline-xs"
          style={{ color: 'var(--color-text-primary)' }}
        >
          售后服务
        </span>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {services.map((svc) => (
            <div
              key={svc.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                flex: 1,
              }}
            >
              <span style={{ fontSize: 20 }}>{svc.icon}</span>
              <span
                className="font-caption-m"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {svc.title}
              </span>
              <span
                className="font-caption-s"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {svc.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}