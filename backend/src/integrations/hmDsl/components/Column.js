"use strict";
/**
 * Column - 纵向 flex 容器。最基础的布局原语，**同时可充当"卡片容器"**。
 *
 * props:
 *   gap?: number              默认 0
 *   padding?: number|number[]
 *   align?: "stretch"|"start"|"center"|"end"  默认 "stretch"
 *   justify?: "start"|"center"|"end"|"space-between"  默认 "start"
 *   background?: string
 *   width?: string|number     默认 "100%"；可传 "auto" / "320px" / 343 (= "343px")
 *   height?: string|number
 *   minHeight?: string|number
 *   maxWidth?: string|number  可选；用于把弹窗卡片限制在 viewport 内（如 "90%" / 320）
 *   maxHeight?: string|number
 *   borderRadius?: number     可选；弹窗卡片常用 16
 *   border?: string           如 "1px solid #E0E0E0"
 *   shadow?: string|boolean   可选；true → 默认 "0 8px 32px rgba(0,0,0,0.12)"；string → 直接用
 *   flex?: number             默认 undefined
 *   position/top/left/right/bottom/transform/zIndex?: 浮层定位常用属性
 *   overflow?: string
 */

const { p, padding } = require("../utils");

function Column(props, childrenHtml) {
  const gap = p(props, "gap", 0);
  const pad = padding(p(props, "padding", 0));
  const align = mapAlign(p(props, "align", "stretch"));
  const justify = mapJustify(p(props, "justify", "start"));
  const bg = p(props, "background", null);
  const w = normSize(p(props, "width", "100%"));
  const h = normSize(p(props, "height", null));
  const minH = normSize(p(props, "minHeight", null));
  const maxW = normSize(p(props, "maxWidth", null));
  const maxH = normSize(p(props, "maxHeight", null));
  const radius = p(props, "borderRadius", null);
  const border = p(props, "border", null);
  const shadowRaw = p(props, "shadow", null);
  const shadow = shadowRaw === true
    ? "0 8px 32px rgba(0,0,0,0.12)"
    : (typeof shadowRaw === "string" ? shadowRaw : null);
  const flex = p(props, "flex", null);
  const position = p(props, "position", null);
  const top = normSize(p(props, "top", null));
  const left = normSize(p(props, "left", null));
  const right = normSize(p(props, "right", null));
  const bottom = normSize(p(props, "bottom", null));
  const transform = p(props, "transform", null);
  const zIndexRaw = p(props, "zIndex", null);
  const zIndex = (zIndexRaw == null || zIndexRaw === "") ? null : Number(zIndexRaw);
  const overflow = p(props, "overflow", null);
  const extraStyle = p(props, "style", null);

  // 卡片型 Column（同时具备"内边距 或 阴影"特征）若被指定了固定 height，
  // 内容超过 height 时会溢出（截图里就会看到"添加项目"/按钮被挤到卡片外）。
  // 这里把固定 height 自动降级为 min-height，让卡片随内容撑开，避免溢出错位。
  // 但仅 background 不能判为卡片：6×6 圆点、小色块等小元素只有 background，
  // 若也降级会把它们变成不确定大小。
  // 另外，只对"较大"高度(>= 32px) 才转 min-height，避免破坏 6px 小圆点等微元素。
  const looksLikeCard = !!(shadow || (pad && pad !== "0px"));
  const hSizePx = typeof h === "string"
    ? (() => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec(h.trim()); return m ? Number(m[1]) : null; })()
    : null;
  const isSmallFixedSize = hSizePx != null && hSizePx > 0 && hSizePx < 32;
  const heightStyle = h
    ? (looksLikeCard && !minH && !isSmallFixedSize ? `min-height:${h}` : `height:${h}`)
    : "";

  const styleParts = [
    "display:flex",
    "flex-direction:column",
    `align-items:${align}`,
    `justify-content:${justify}`,
    gap ? `gap:${gap}px` : "",
    pad && pad !== "0px" ? `padding:${pad}` : "",
    bg ? `background:${bg}` : "",
    w ? `width:${w}` : "",
    heightStyle,
    minH ? `min-height:${minH}` : "",
    maxW ? `max-width:${maxW}` : "",
    maxH ? `max-height:${maxH}` : "",
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
    overflow ? `overflow:${overflow}` : "",
    "box-sizing:border-box",
    typeof extraStyle === "string" ? extraStyle : "",
  ].filter(Boolean).join(";");
  return `<div data-hm="Column" style="${styleParts}">${childrenHtml}</div>`;
}

function normSize(v) {
  if (v == null) return null;
  if (typeof v === "number") return `${v}px`;
  return String(v);
}

// borderRadius 容错：
//   number 直接拼 px；字符串若已带单位/百分号原样输出，否则补 px
function formatRadius(v) {
  if (typeof v === "number") return `${v}px`;
  const s = String(v).trim();
  if (/(px|%|em|rem|vh|vw)$/i.test(s)) return s;
  if (/^\d+(?:\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

function mapAlign(v) {
  return { stretch: "stretch", start: "flex-start", center: "center", end: "flex-end" }[v] || v;
}
function mapJustify(v) {
  return { start: "flex-start", center: "center", end: "flex-end", "space-between": "space-between" }[v] || v;
}

module.exports = Column;
