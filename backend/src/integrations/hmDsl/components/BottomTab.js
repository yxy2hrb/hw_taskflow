"use strict";
/**
 * BottomTab - 底部导航 Tab 栏。
 *
 * 用于"全屏页 / 替换页"时**底部固定显示**的 5 项 Tab（首页/商城/工作台/服务/我）。
 * 之前 LLM 用 state-toggle 把整页 Pixso frame 替换后，常常**忘画底部 Tab**，
 * 导致截图底部一片空白。给 LLM 提供一个"一行代码就能画 Tab"的组件，减少漏画。
 *
 * props:
 *   items?: Array<{ label: string, icon?: string }>
 *           默认 [{label:"首页",icon:"home"}, {label:"商城",icon:"storefront"},
 *                {label:"工作台",icon:"work"}, {label:"服务",icon:"support_agent"},
 *                {label:"我",icon:"person"}]
 *   activeIndex?: number  默认 2（"工作台"高亮）
 *   activeColor?: string  默认 #386BF5
 *   inactiveColor?: string  默认 rgba(0,0,0,0.60)
 *   background?: string  默认 #FFFFFF
 *   height?: number       默认 56
 *
 * 渲染：position:relative，flex row，items 等分；activeIndex 的 label + icon 上色。
 * 调用 Page/FullscreenPanel 时建议把 BottomTab 作为最后一个子节点。
 */

const { escapeHtml, p, normalizeIconName } = require("../utils");

const DEFAULT_ITEMS = [
  { label: "首页", icon: "home" },
  { label: "商城", icon: "storefront" },
  { label: "工作台", icon: "work" },
  { label: "服务", icon: "support_agent" },
  { label: "我", icon: "person" },
];

function BottomTab(props) {
  const itemsIn = Array.isArray(p(props, "items", null)) ? p(props, "items", null) : DEFAULT_ITEMS;
  const activeIndex = Number.isFinite(Number(p(props, "activeIndex", 2))) ? Number(p(props, "activeIndex", 2)) : 2;
  const activeColor = p(props, "activeColor", "#386BF5");
  const inactiveColor = p(props, "inactiveColor", "rgba(0,0,0,0.60)");
  const bg = p(props, "background", "#FFFFFF");
  const h = Number(p(props, "height", 56)) || 56;

  const cells = itemsIn.map((it, idx) => {
    const isActive = idx === activeIndex;
    const color = isActive ? activeColor : inactiveColor;
    const iconName = normalizeIconName(it && it.icon);
    const iconHtml = iconName
      ? `<span class="mi" aria-hidden="true" style="font-family:'Material Icons';font-size:24px;color:${color};line-height:1">${escapeHtml(iconName)}</span>`
      : `<span style="width:24px;height:24px;display:inline-block"></span>`;
    return `<div data-hm-tab-item="${idx}" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:${color};">${iconHtml}<span style="font-size:11px;line-height:14px;color:${color};">${escapeHtml(String((it && it.label) || ""))}</span></div>`;
  }).join("");

  return `<div data-hm="BottomTab" style="display:flex;flex-direction:row;align-items:stretch;justify-content:space-between;width:100%;height:${h}px;background:${bg};border-top:0.5px solid rgba(0,0,0,0.08);box-sizing:border-box;flex-shrink:0;">${cells}</div>`;
}

module.exports = BottomTab;
