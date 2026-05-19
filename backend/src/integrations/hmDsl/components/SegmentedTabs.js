"use strict";
/**
 * SegmentedTabs - 横向 segmented tab（最常见的"切换 tab"形态）。
 *
 * props:
 *   items: string[]   必填
 *   active: number    默认 0
 *   variant?: "underline" | "pill"  默认 "underline"
 *
 * 视觉：
 *   - underline: 等分横向排列，激活项下方一根蓝色横线
 *   - pill: 圆角胶囊，激活项白底
 */

const { color: C, font: F, spacing: S, radius: R } = require("../tokens");
const { p, escapeHtml } = require("../utils");

function SegmentedTabs(props) {
  const items = Array.isArray(props.items) ? props.items : [];
  const active = Number(p(props, "active", 0));
  const variant = p(props, "variant", "underline");

  if (!items.length) return "";

  if (variant === "pill") {
    return renderPill(items, active);
  }
  return renderUnderline(items, active);
}

function renderUnderline(items, active) {
  const cells = items.map((label, i) => {
    const isActive = i === active;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:${S.md}px 0;cursor:pointer;">
      <span style="font-size:${F.sizeLg}px;font-weight:${isActive ? F.weightSemibold : F.weightRegular};color:${isActive ? C.textPrimary : C.textSecondary};">${escapeHtml(label)}</span>
      <span style="margin-top:${S.xs}px;width:20px;height:3px;border-radius:2px;background:${isActive ? C.primary : "transparent"};"></span>
    </div>`;
  }).join("");
  return `<div data-hm="SegmentedTabs" style="display:flex;background:${C.surface};border-bottom:1px solid ${C.divider};">${cells}</div>`;
}

function renderPill(items, active) {
  const cells = items.map((label, i) => {
    const isActive = i === active;
    return `<div style="flex:1;padding:${S.sm}px 0;text-align:center;border-radius:${R.pill}px;background:${isActive ? C.surface : "transparent"};color:${isActive ? C.textPrimary : C.textSecondary};font-size:${F.sizeMd}px;font-weight:${isActive ? F.weightSemibold : F.weightRegular};box-shadow:${isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none"};cursor:pointer;">${escapeHtml(label)}</div>`;
  }).join("");
  return `<div data-hm="SegmentedTabs" style="display:flex;gap:${S.xs}px;padding:${S.xs}px;margin:${S.md}px ${S.lg}px;background:${C.bgIconSolid};border-radius:${R.pill}px;">${cells}</div>`;
}

module.exports = SegmentedTabs;
