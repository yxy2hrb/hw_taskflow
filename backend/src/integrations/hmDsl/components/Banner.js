"use strict";
/**
 * Banner - 顶部横幅告警/提示（state_3 的"空选警告"用）。
 *
 * props:
 *   text: string                    必填
 *   variant?: "warning" | "info" | "success"  默认 "warning"
 *   icon?: string                   默认根据 variant 自动（warning→"warning"，info→"info"，success→"check_circle"）
 *   closable?: boolean              默认 true（右端显示 X）
 *   height?: number                 默认 44
 */

const { color: C, font: F, spacing: S } = require("../tokens");
const { p, escapeHtml, normalizeIconName } = require("../utils");

const VARIANT = {
  warning: { bg: C.warningSoft, fg: C.warning,   icon: "warning" },
  info:    { bg: "#EEF4FF",     fg: C.primary,   icon: "info" },
  success: { bg: "#E6F8EC",     fg: C.success,   icon: "check_circle" },
};

function Banner(props) {
  const text = String(p(props, "text", ""));
  const variant = p(props, "variant", "warning");
  const v = VARIANT[variant] || VARIANT.warning;
  const icon = normalizeIconName(p(props, "icon", v.icon)) || v.icon;
  const closable = p(props, "closable", true);
  const h = Number(p(props, "height", 44));

  const closeBtn = closable
    ? `<span class="mi" style="font-size:18px;color:rgba(0,0,0,0.40);margin-left:auto;cursor:pointer;">close</span>`
    : "";

  return `<div data-hm="Banner" style="height:${h}px;padding:0 ${S.lg}px;display:flex;align-items:center;gap:${S.sm}px;background:${v.bg};color:${v.fg};font-family:${F.family};font-size:${F.sizeMd}px;font-weight:${F.weightMedium};box-sizing:border-box;">
  <span class="mi" style="font-size:18px;color:${v.fg};">${escapeHtml(icon)}</span>
  <span style="flex:1;line-height:1.3;">${escapeHtml(text)}</span>
  ${closeBtn}
</div>`;
}

module.exports = Banner;
