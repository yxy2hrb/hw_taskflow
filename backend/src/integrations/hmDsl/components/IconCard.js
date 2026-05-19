"use strict";
/**
 * IconCard - 图标 + label 的卡片（HarmonyOS 设置类页面最常见的"行业/分类"卡片）。
 *
 * props:
 *   icon: string         必填（Material 风格名）
 *   label: string        必填
 *   selected?: boolean   默认 false
 *   iconColor?: string   默认 textPrimary
 *   iconBg?: string      默认 bgIconSolid
 */

const { color: C, font: F, spacing: S, radius: R } = require("../tokens");
const { p, escapeHtml, normalizeIconName } = require("../utils");

function IconCard(props) {
  const icon = normalizeIconName(p(props, "icon", null)) || "";
  const label = String(p(props, "label", ""));
  const selected = !!p(props, "selected", false);
  const iconColor = p(props, "iconColor", C.iconPrimary);
  const iconBg = selected ? C.bgChipHover : p(props, "iconBg", C.bgIconSolid);
  const borderColor = selected ? C.primary : "transparent";
  const labelColor = selected ? C.primary : C.textPrimary;

  return `<div data-hm="IconCard" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${S.sm}px;padding:${S.lg}px ${S.sm}px;background:${C.surface};border:1px solid ${borderColor};border-radius:${R.md}px;box-sizing:border-box;cursor:pointer;">
  <div style="width:48px;height:48px;border-radius:${R.pill}px;background:${iconBg};display:flex;align-items:center;justify-content:center;">
    <span class="mi" style="font-size:24px;color:${iconColor};">${escapeHtml(icon)}</span>
  </div>
  <span style="font-size:${F.sizeMd}px;font-weight:${F.weightMedium};color:${labelColor};line-height:1.3;text-align:center;">${escapeHtml(label)}</span>
</div>`;
}

module.exports = IconCard;
