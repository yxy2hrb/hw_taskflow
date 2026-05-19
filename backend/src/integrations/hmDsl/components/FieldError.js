"use strict";
/**
 * FieldError - 单行红色错误提示文本（行内字段校验场景标准件）。
 *
 * 使用场景：
 *   - 作为 FormField 的 error prop（推荐）
 *   - 作为独立节点，配合 inject.mode="append" 贴在 base 输入框下方
 *
 * props:
 *   text: string                  错误文本（必填）
 *   icon?: string                 左侧图标名，默认 "error"。设为 "" 隐藏。
 *   size?: "sm"|"md"              字号，默认 sm
 *   marginTop?: number            上间距，默认 4
 */

const { color: C, font: F } = require("../tokens");
const { p, escapeHtml, normalizeIconName } = require("../utils");

function FieldError(props) {
  const text = String(p(props, "text", "") || "");
  if (!text) return "";
  const iconName = normalizeIconName(p(props, "icon", "error")) || "error";
  const size = p(props, "size", "sm");
  const fz = size === "md" ? F.sizeMd : F.sizeSm;
  const mt = Number(p(props, "marginTop", 4));

  const icon = iconName
    ? `<span class="mi" style="font-size:${fz + 2}px;color:${C.warning};margin-right:4px;flex-shrink:0;line-height:1;">${escapeHtml(iconName)}</span>`
    : "";

  return `<div data-hm="FieldError" style="display:flex;align-items:center;margin-top:${mt}px;font-family:${F.family};font-size:${fz}px;color:${C.warning};line-height:1.4;">${icon}<span>${escapeHtml(text)}</span></div>`;
}

module.exports = FieldError;
