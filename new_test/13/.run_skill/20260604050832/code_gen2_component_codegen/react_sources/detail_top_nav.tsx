import React from 'react'
import { ShoppingCart, Bell, LayoutGrid } from 'lucide-react'

export default function DetailTopNav() {
  return (
    <div
      data-component-id="detail_top_nav"
      className="tf-cg-detail-topnav"
      style={{
        position: 'absolute',
        top: 36,
        left: 0,
        width: 360,
        height: 56,
        zIndex: 10,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ height: 56, padding: '0 var(--spacing-xl)' }}
      >
        {/* 左侧：返回按钮 */}
        <div className="flex items-center min-w-0" style={{ gap: 'var(--spacing-lg)' }}>
          <button
            className="flex items-center justify-center bg-transparent border-none cursor-pointer flex-shrink-0"
            style={{ width: 40, height: 40, color: '#ffffff' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginLeft: -4 }}>
              <path
                d="M15 19L8 12L15 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center" style={{ gap: 5 }}>
          <button
            className="flex items-center justify-center bg-transparent border-none cursor-pointer relative"
            style={{ width: 40, height: 40, color: '#ffffff' }}
          >
            <ShoppingCart size={24} />
          </button>
          <button
            className="flex items-center justify-center bg-transparent border-none cursor-pointer relative"
            style={{ width: 40, height: 40, color: '#ffffff' }}
          >
            <LayoutGrid size={24} />
          </button>
          <button
            className="flex items-center justify-center bg-transparent border-none cursor-pointer relative"
            style={{ width: 40, height: 40, color: '#ffffff' }}
          >
            <Bell size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}