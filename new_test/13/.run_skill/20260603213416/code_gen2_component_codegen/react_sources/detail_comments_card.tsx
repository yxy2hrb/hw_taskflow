import React from 'react'
import SectionLayout from '@/components/SectionLayout'

const tabs = [
  { id: 'qa', label: '问答' },
  { id: 'review', label: '评价' },
]

export default function GeneratedComponent() {
  const [activeTab, setActiveTab] = React.useState('qa')

  return (
    <div
      data-component-id="detail_comments_card"
      style={{
        position: 'absolute',
        left: 0,
        top: 768,
        width: 360,
        height: 92,
      }}
    >
      <SectionLayout
        variant="card"
        title="评论/问答"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div className="tf-cg-comment-preview">
          <div className="tf-cg-comment-item">
            <div className="tf-cg-comment-avatar">
              <span className="font-caption-m" style={{ color: 'var(--color-text-white)' }}>用</span>
            </div>
            <div className="tf-cg-comment-body">
              <span className="font-caption-m" style={{ color: 'var(--color-text-muted)' }}>用户****8</span>
              <p className="font-body-s tf-cg-comment-text" style={{ color: 'var(--color-text-secondary)' }}>
                咨询内容：这款产品支持定制吗？
              </p>
            </div>
          </div>
        </div>
      </SectionLayout>
    </div>
  )
}