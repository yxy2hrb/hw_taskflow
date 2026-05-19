"use strict";
/**
 * Spinner - 圆环旋转加载指示。
 *
 * 用 CSS @keyframes 旋转一个上半段着色的圆环；颜色 + 大小可调。
 * 多个 Spinner 在同一编译里只注入一份 @keyframes（用 ctx.injectedKeyframes 去重）。
 *
 * props:
 *   size?: number     默认 42
 *   color?: string    默认 primary
 *   thickness?: number 默认 4
 *   speed?: number    默认 0.9（秒/圈）
 *   text?: string     可选；放在 Spinner 下方
 */

const { color: C, font: F, spacing: S } = require("../tokens");
const { p, escapeHtml } = require("../utils");

const KEYFRAMES = `<style data-hm="Spinner-kf">
@keyframes hm-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
.hm-spinner { animation: hm-spin var(--hm-spin-speed, 0.9s) linear infinite; border-style:solid; border-radius:50%; box-sizing:border-box; }
</style>`;

function Spinner(props, _children, ctx) {
  const size = Number(p(props, "size", 42));
  const col = p(props, "color", C.primary);
  const thickness = Number(p(props, "thickness", 4));
  const speed = Number(p(props, "speed", 0.9));
  const text = p(props, "text", null);

  let kf = "";
  if (ctx && !ctx._spinnerKfInjected) {
    kf = KEYFRAMES;
    ctx._spinnerKfInjected = true;
  }

  const ring = `<div class="hm-spinner" style="--hm-spin-speed:${speed}s;width:${size}px;height:${size}px;border-width:${thickness}px;border-color:${col} transparent transparent transparent;"></div>`;
  const label = text
    ? `<div style="margin-top:${S.md}px;font-family:${F.family};font-size:${F.sizeMd}px;color:${C.textPrimary};">${escapeHtml(text)}</div>`
    : "";

  return `${kf}<div data-hm="Spinner" style="display:flex;flex-direction:column;align-items:center;">${ring}${label}</div>`;
}

module.exports = Spinner;
