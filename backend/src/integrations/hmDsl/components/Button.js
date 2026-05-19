"use strict";
/**
 * Button - 胶囊按钮（HarmonyOS primary / secondary / warning / text 4 种 variant）。
 *
 * props:
 *   label: string                   必填
 *   variant?: "primary" | "secondary" | "warning" | "text"  默认 "primary"
 *   size?: "compact" | "regular" | "large"  默认 "regular"
 *   disabled?: boolean
 *   loading?: boolean              当 true 时在 label 左侧加一个小 spinner（v0 用 CSS border 圈代替）
 *   block?: boolean                当 true 时 width:100% 充满父
 *   width?: string|number
 *   background?: string
 *   color?: string
 *   border?: string
 *   borderRadius?: number
 *   icon?: string | { name:string, size?:number, color?:string, spin?:boolean }
 *                                  Material 图标名，可选；放在 label 左侧
 *                                  对象形式兼容 LLM 直接输出复合属性
 *   loading?: boolean              与 disabled 区分：仍可点击但显示 spinner
 */

const { color: C, font: F, spacing: S, radius: R } = require("../tokens");
const { p, escapeHtml } = require("../utils");

const VARIANT = {
  primary:   { bg: C.primary,       fg: C.onPrimary,    border: "transparent" },
  secondary: { bg: C.surface,       fg: C.primary,      border: C.primary },
  warning:   { bg: C.warning,       fg: C.onPrimary,    border: "transparent" },
  text:      { bg: "transparent",   fg: C.primary,      border: "transparent" },
};

const SIZE = {
  compact: { h: 32, padX: S.lg, fz: F.sizeSm },
  regular: { h: 40, padX: S.xl, fz: F.sizeMd },
  large:   { h: 48, padX: S.xxl, fz: F.sizeLg },
};

// 公认的 "spinner" 类 Material Icons Round 名（自动加 rotate animation）
const SPINNER_ICONS = /^(progress_activity|sync|refresh|cached|autorenew|hourglass_empty|hourglass_bottom|hourglass_top)$/i;
const SPINNER_ALIASES = /^(spinner|loading|loader)$/i;

function normalizeIconName(name) {
  return SPINNER_ALIASES.test(name) ? "progress_activity" : name;
}

/**
 * 把 icon prop 归一化为 { name, sizeOverride, colorOverride, spin }。
 * 兼容 LLM 的两种常见写法：
 *   "icon": "progress_activity"
 *   "icon": { "name": "progress_activity", "size": 20, "color": "#0A59F7" }
 */
function normalizeIcon(icon) {
  if (!icon) return null;
  if (typeof icon === "string") {
    const rawName = icon.trim();
    if (!rawName) return null;
    const name = normalizeIconName(rawName);
    return { name, sizeOverride: null, colorOverride: null, spin: SPINNER_ICONS.test(name) };
  }
  if (typeof icon === "object" && typeof icon.name === "string") {
    const rawName = icon.name.trim();
    if (!rawName) return null;
    const name = normalizeIconName(rawName);
    return {
      name,
      sizeOverride: typeof icon.size === "number" ? icon.size : null,
      colorOverride: typeof icon.color === "string" ? icon.color : null,
      spin: icon.spin === true || SPINNER_ICONS.test(name),
    };
  }
  return null;
}

function Button(props) {
  const label = String(p(props, "label", ""));
  const v = VARIANT[p(props, "variant", "primary")] || VARIANT.primary;
  const sz = SIZE[p(props, "size", "regular")] || SIZE.regular;
  const disabled = !!p(props, "disabled", false);
  const loading = !!p(props, "loading", false);
  const block = !!p(props, "block", false);
  const iconNorm = normalizeIcon(p(props, "icon", null));
  const widthProp = p(props, "width", null);
  const bgOverride = p(props, "background", null);
  const colorOverride = p(props, "color", null);
  const borderOverride = p(props, "border", null);
  const radiusOverride = p(props, "borderRadius", null);
  const extraStyle = p(props, "style", null);

  // loading=true 自动加 spinner 图标（若 LLM 没传 icon）
  const finalIcon = iconNorm || (loading
    ? { name: "progress_activity", sizeOverride: null, colorOverride: null, spin: true }
    : null);

  const opacity = disabled ? 0.4 : 1;
  const cursor = disabled ? "not-allowed" : "pointer";
  const width = block ? "width:100%;" : (widthProp != null ? `width:${normSize(widthProp)};` : "");
  const bg = bgOverride || v.bg;
  const fg = colorOverride || v.fg;
  const border = borderOverride || `1px solid ${v.border}`;
  const radius = radiusOverride != null ? `${radiusOverride}px` : `${R.pill}px`;

  let iconHtml = "";
  let spinKeyframes = "";
  if (finalIcon) {
    const fSize = finalIcon.sizeOverride || (sz.fz + 4);
    const fColor = finalIcon.colorOverride || fg;
    if (finalIcon.spin) {
      // 旋转图标改用纯 CSS 圆环（独立于 Material Icons 字体 ligature）。
      // 之前用 .mi + "progress_activity" 文本，如果字体 ligature 没生效，
      // 截图里就会显示一长串 "progress_activity" 字面，把按钮文案挤走。
      const ringSize = Math.max(12, fSize - 2);
      iconHtml = `<span aria-hidden="true" style="display:inline-block;flex-shrink:0;width:${ringSize}px;height:${ringSize}px;margin-right:${S.xs}px;border:2px solid ${fColor};border-top-color:transparent;border-radius:50%;animation:hmspin 1s linear infinite;vertical-align:middle;box-sizing:border-box;"></span>`;
      spinKeyframes = `<style>@keyframes hmspin{to{transform:rotate(360deg)}}</style>`;
    } else {
      iconHtml = `<span class="mi" style="font-size:${fSize}px;color:${fColor};margin-right:${S.xs}px;display:inline-block;">${escapeHtml(finalIcon.name)}</span>`;
    }
  }

  return `${spinKeyframes}<button data-hm="Button" ${disabled ? "disabled" : ""} style="display:inline-flex;align-items:center;justify-content:center;height:${sz.h}px;padding:0 ${sz.padX}px;background:${bg};color:${fg};border:${border};border-radius:${radius};font-family:${F.family};font-size:${sz.fz}px;font-weight:${F.weightMedium};line-height:1;cursor:${cursor};opacity:${opacity};${width}box-sizing:border-box;outline:none;${typeof extraStyle === "string" ? extraStyle : ""}">${iconHtml}${escapeHtml(label)}</button>`;
}

function normSize(v) {
  if (typeof v === "number") return `${v}px`;
  return String(v);
}

module.exports = Button;
