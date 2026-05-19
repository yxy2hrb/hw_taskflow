"use strict";
/**
 * Row - 横向 flex 容器（Column 的横向双生）。
 *
 * props 同 Column：
 *   gap?: number
 *   padding?: number|number[]
 *   align?: "stretch"|"start"|"center"|"end"
 *   justify?: "start"|"center"|"end"|"space-between"|"space-around"
 *   background?: string
 *   width?: string  默认 100%
 *   height?: string|number
 *   border?: string
 *   borderRadius?: number
 *   flex?: number
 *   wrap?: boolean  允许换行
 *
 * Toast / Snackbar / 浮动条 专用（让 Row 能"浮"在屏幕某处）：
 *   position?: "fixed"|"absolute"|"sticky"|"relative"
 *   top?: number|string       支持 calc(...) 字符串
 *   left?: number|string
 *   right?: number|string
 *   bottom?: number|string
 *   transform?: string         e.g. "translateX(-50%)"
 *   zIndex?: number
 */

const { p, padding } = require("../utils");

// 移动端常见 viewport 宽度（用于判断 Row 子节点固定 px 是否超出）
const MOBILE_VIEWPORT = 360;

function Row(props, childrenHtml) {
  const gap = p(props, "gap", 0);
  const pad = padding(p(props, "padding", 0));
  const align = mapAlign(p(props, "align", "center"));
  const justify = mapJustify(p(props, "justify", "start"));
  const bg = p(props, "background", null);
  const w = normSize(p(props, "width", "100%"));
  const h = normSize(p(props, "height", null));
  const maxW = normSize(p(props, "maxWidth", null));
  const radius = p(props, "borderRadius", null);
  const border = p(props, "border", null);
  const shadowRaw = p(props, "shadow", null);
  const shadow = shadowRaw === true
    ? "0 8px 32px rgba(0,0,0,0.12)"
    : (typeof shadowRaw === "string" ? shadowRaw : null);
  const flex = p(props, "flex", null);
  const explicitWrap = p(props, "wrap", null);

  // 自动 wrap 启发式：当子 HTML 里出现 ≥2 个固定 px width 且总和 > 360 时，
  // 强制 flex-wrap:wrap，否则在 360 viewport 下会被挤出右边。
  // 之前 new_test/4 出现 Row[children:[Col{width:280},Col{width:280},gap:24]] = 584px 溢出。
  const wrap = explicitWrap == null
    ? autoWrapHeuristic(childrenHtml, gap, MOBILE_VIEWPORT)
    : !!explicitWrap;

  // Toast / Snackbar / 浮动条定位 props（v9 修复：之前被静默丢弃，导致 Toast 不浮起来）
  const position = p(props, "position", null);
  const top = normSize(p(props, "top", null));
  const left = normSize(p(props, "left", null));
  const right = normSize(p(props, "right", null));
  const bottom = normSize(p(props, "bottom", null));
  const transform = p(props, "transform", null);
  const zIndexRaw = p(props, "zIndex", null);
  const zIndex = (zIndexRaw == null || zIndexRaw === "") ? null : Number(zIndexRaw);
  const extraStyle = p(props, "style", null);

  const styleParts = [
    "display:flex",
    "flex-direction:row",
    `align-items:${align}`,
    `justify-content:${justify}`,
    wrap ? "flex-wrap:wrap" : "",
    gap ? `gap:${gap}px` : "",
    pad && pad !== "0px" ? `padding:${pad}` : "",
    bg ? `background:${bg}` : "",
    w ? `width:${w}` : "",
    h ? `height:${h}` : "",
    maxW ? `max-width:${maxW}` : "",
    radius != null ? `border-radius:${formatRadius(radius)}` : "",
    border ? `border:${border}` : "",
    shadow ? `box-shadow:${shadow}` : "",
    flex != null ? `flex:${flex}` : "",
    position ? `position:${position}` : "",
    top != null ? `top:${top}` : "",
    left != null ? `left:${left}` : "",
    right != null ? `right:${right}` : "",
    bottom != null ? `bottom:${bottom}` : "",
    transform ? `transform:${transform}` : "",
    (zIndex != null && !Number.isNaN(zIndex)) ? `z-index:${zIndex}` : "",
    "box-sizing:border-box",
    typeof extraStyle === "string" ? extraStyle : "",
  ].filter(Boolean).join(";");
  return `<div data-hm="Row" style="${styleParts}">${childrenHtml}</div>`;
}

function normSize(v) {
  if (v == null) return null;
  if (typeof v === "number") return `${v}px`;
  return String(v);
}

// borderRadius 容错：number→px；字符串若已带单位/% 原样输出，否则补 px
function formatRadius(v) {
  if (typeof v === "number") return `${v}px`;
  const s = String(v).trim();
  if (/(px|%|em|rem|vh|vw)$/i.test(s)) return s;
  if (/^\d+(?:\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

/**
 * 在 childrenHtml 里抓"顶层直接子节点"的固定 px width。
 * 因为 children 只有一层 HTML（已编译），所以扫一遍 `width:NNNpx` 就够。
 * 但要避免把 max-width / min-width 算进来。
 *
 * 启发式：找到所有直接位于 `style="..."` 中的 `width:XXXpx`，累加；
 * 大于一定阈值（如 360 - 16padding）就触发 wrap。
 */
function autoWrapHeuristic(childrenHtml, gap, viewport) {
  if (typeof childrenHtml !== "string" || !childrenHtml.includes("width:")) return false;
  // 情况 A：找所有 `width:NNN(.N)?px`（跳过 max-width / min-width / line-width 等）
  const widths = [];
  const re = /(?:^|[;\s"])(width:(\d+(?:\.\d+)?)px)/g;
  let m;
  while ((m = re.exec(childrenHtml)) !== null) {
    widths.push(Number(m[2]));
  }
  if (widths.length >= 2) {
    const sum = widths.reduce((a, b) => a + b, 0) + (gap || 0) * Math.max(0, widths.length - 1);
    if (sum > viewport + 24) return true;
  }
  // 情况 B：固定 px + calc(100% - Mpx) 互补。常见 LLM 错误：
  //   Col1 width:360px + Col2 width:calc(100% - 360px) 在 360px viewport 下
  //   Col1 已吃满整个 viewport → Col2 实际 0px → 文本被压成"逐字垂直"。
  //   只要任一固定 px 接近或超过 viewport，就一定要 wrap。
  if (widths.length >= 1 && /width:\s*calc\(/i.test(childrenHtml)) {
    const maxFixed = Math.max(...widths);
    // viewport - 24 留出一些 padding 空间
    if (maxFixed >= viewport - 24) return true;
  }
  // 情况 C：百分比 width 子节点加和 ≥ 100% 且有 gap → 必然溢出（v23 state_3 事故：
  //   两子各 width:"50%" + Row gap:24 → 100% + 24px 溢出，spinner 右半出界）。
  //   只有 gap > 0 才触发，保证 50%+50% 无 gap 仍能正常并排。
  if (gap && gap > 0) {
    const pctRe = /(?:^|[;\s"])width:\s*(\d+(?:\.\d+)?)%/g;
    const pcts = [];
    let pm;
    while ((pm = pctRe.exec(childrenHtml)) !== null) {
      pcts.push(Number(pm[1]));
    }
    if (pcts.length >= 2) {
      const sumPct = pcts.reduce((a, b) => a + b, 0);
      if (sumPct >= 100) return true;
    }
  }
  return false;
}

function mapAlign(v) {
  return { stretch: "stretch", start: "flex-start", center: "center", end: "flex-end" }[v] || v;
}
function mapJustify(v) {
  return { start: "flex-start", center: "center", end: "flex-end", "space-between": "space-between", "space-around": "space-around" }[v] || v;
}

module.exports = Row;
