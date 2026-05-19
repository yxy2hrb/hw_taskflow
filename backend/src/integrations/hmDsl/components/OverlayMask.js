"use strict";
/**
 * OverlayMask - 半透明遮罩（用于 Modal/Loading 的背景；不放在 FullscreenPanel 里时使用）。
 *
 * props:
 *   opacity?: number     默认 0.4
 *   color?: string       默认 #000
 *   blur?: number        默认 0（如果设置，启用 backdrop-filter:blur(Npx)）
 *   align?: "center"     默认 center（子内容居中）
 */

const { p } = require("../utils");

function OverlayMask(props, childrenHtml) {
  const opacity = Number(p(props, "opacity", 0.4));
  const color = p(props, "color", "#000");
  const blur = Number(p(props, "blur", 0));
  const align = p(props, "align", "center");

  const bg = colorWithAlpha(color, opacity);
  const justify = align === "center" ? "center" : "flex-start";
  const items = align === "center" ? "center" : "flex-start";

  const filter = blur > 0 ? `backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);` : "";

  // position:fixed + 高 z-index：原 absolute 在 D2C 容器有 transform/contain 的祖先时
  // 会被截断，不能真正覆盖整屏（v8 test/5 state_3 层级混乱根因）。
  return `<div data-hm="OverlayMask" style="position:fixed;inset:0;display:flex;align-items:${items};justify-content:${justify};background:${bg};${filter}z-index:10000;">${childrenHtml}</div>`;
}

function colorWithAlpha(hexOrRgb, alpha) {
  if (typeof hexOrRgb !== "string") return `rgba(0,0,0,${alpha})`;
  const s = hexOrRgb.trim();
  if (s.startsWith("rgba(")) return s;
  if (s.startsWith("rgb(")) return s.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(0,0,0,${alpha})`;
}

module.exports = OverlayMask;
