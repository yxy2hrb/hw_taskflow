import React from 'react'
import SectionLayout from '@/components/SectionLayout'
import Child_cfg_prod_1 from './cfg_prod_1'

export default function GeneratedComponent() {
  return (
    <div data-component-id="config_product_list_card">
      <SectionLayout
        variant="card"
        title="产品清单"
        headerRightAction={
          <button
            onClick={() => {}}
            className="bg-transparent border-none cursor-pointer"
            style={{ padding: 0 }}
          >
            <span
              className="font-headline-xs"
              style={{ color: 'var(--color-primary)' }}
            >
              编辑
            </span>
          </button>
        }
      >
        <Child_cfg_prod_1 />
      </SectionLayout>
    </div>
  )
}