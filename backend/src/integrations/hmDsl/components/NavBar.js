"use strict";
/**
 * NavBar - 顶部导航栏（默认 56px，左 icon + 标题 + 右 icon）。
 *
 * props:
 *   title: string           必填
 *   leftIcon?: string       默认 "arrow_back"；传 null 关闭
 *   rightIcon?: string      默认 null
 *   height?: number         默认 56
 *   align?: "left" | "center"  默认 "left"
 *   background?: string     默认 surface（白）
 */

const { color: C, font: F, spacing: S, safeArea } = require("../tokens");
const { p, escapeHtml, normalizeIconName } = require("../utils");

function NavBar(props) {
  const title = String(props.title || "");
  const leftIcon = normalizeIconName("leftIcon" in props ? props.leftIcon : "arrow_back");
  const rightIcon = normalizeIconName(props.rightIcon || null);
  const h = p(props, "height", safeArea.navBarHeight);
  const align = p(props, "align", "left");
  const bg = p(props, "background", C.surface);

  const titleStyle = align === "center"
    ? `flex:1;text-align:center;font-size:${F.sizeXl}px;font-weight:${F.weightSemibold};color:${C.textPrimary};`
    : `font-size:${F.sizeXl}px;font-weight:${F.weightSemibold};color:${C.textPrimary};`;

  const leftSlot = leftIcon
    ? `<span class="mi" style="font-size:24px;color:${C.iconPrimary};margin-right:${S.md}px;cursor:pointer;">${escapeHtml(leftIcon)}</span>`
    : `<span style="width:24px;margin-right:${S.md}px;"></span>`;

  const rightSlot = rightIcon
    ? `<span class="mi" style="font-size:24px;color:${C.iconPrimary};margin-left:auto;cursor:pointer;">${escapeHtml(rightIcon)}</span>`
    : "";

  return `<div data-hm="NavBar" style="height:${h}px;padding:0 ${S.lg}px;display:flex;align-items:center;background:${bg};border-bottom:1px solid ${C.border};box-sizing:border-box;">
  ${leftSlot}
  <span style="${titleStyle}">${escapeHtml(title)}</span>
  ${rightSlot}
</div>`;
}

module.exports = NavBar;
