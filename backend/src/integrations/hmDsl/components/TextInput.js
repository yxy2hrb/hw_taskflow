"use strict";
/**
 * TextInput - 文本输入框（HarmonyOS 浅灰底圆角无外边框样式）。
 *
 * props:
 *   placeholder?: string
 *   value?: string                直接显示的值（无 React 状态绑定）
 *   icon?: string                 左侧 Material 图标
 *   suffix?: string               右侧 Material 图标
 *   size?: "compact"|"regular"|"large"  默认 regular（高 40）
 *   block?: boolean               默认 true 占满父
 *   disabled?: boolean
 *   invalid?: boolean             true 时边框变红
 *   type?: string                 默认 text
 */

const { color: C, font: F, spacing: S, radius: R } = require("../tokens");
const { p, escapeHtml, escapeAttr, normalizeIconName } = require("../utils");

const SIZE = {
  compact: { h: 32, fz: F.sizeSm, padX: S.md },
  regular: { h: 40, fz: F.sizeMd, padX: S.lg },
  large:   { h: 48, fz: F.sizeLg, padX: S.lg },
};

function TextInput(props) {
  const placeholder = String(p(props, "placeholder", ""));
  const value = p(props, "value", "");
  const icon = normalizeIconName(p(props, "icon", null));
  const suffix = normalizeIconName(p(props, "suffix", null));
  const sz = SIZE[p(props, "size", "regular")] || SIZE.regular;
  const block = !!p(props, "block", true);
  const disabled = !!p(props, "disabled", false);
  const invalid = !!p(props, "invalid", false);
  const type = p(props, "type", "text");

  const border = invalid ? C.warning : C.border;
  const bg = disabled ? "#F5F5F5" : "#F7F8FA";
  const width = block ? "width:100%;" : "";

  const left = icon
    ? `<span class="mi" style="font-size:${sz.fz + 4}px;color:${C.iconSecondary};margin-right:${S.sm}px;flex-shrink:0;">${escapeHtml(icon)}</span>`
    : "";
  const right = suffix
    ? `<span class="mi" style="font-size:${sz.fz + 4}px;color:${C.iconSecondary};margin-left:${S.sm}px;flex-shrink:0;">${escapeHtml(suffix)}</span>`
    : "";

  return `<div data-hm="TextInput" style="display:flex;align-items:center;height:${sz.h}px;padding:0 ${sz.padX}px;background:${bg};border:1px solid ${border};border-radius:${R.sm}px;${width}box-sizing:border-box;font-family:${F.family};">
  ${left}
  <input type="${escapeAttr(type)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" ${disabled ? "disabled" : ""} style="flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:${sz.fz}px;color:${C.textPrimary};line-height:1;">
  ${right}
</div>`;
}

module.exports = TextInput;
