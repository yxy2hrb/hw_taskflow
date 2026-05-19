"use strict";
/**
 * Image - 图片组件。
 *
 * 用于"拓扑图 / 网络图 / 设备示意图 / 占位图" 等场景，避免 LLM
 * 用纯文字 "拓扑图（SVG 渲染）" 当占位（参考 new_test/5 state_4 事故）。
 *
 * props:
 *   src?: string                   - 图片 URL。若缺失则根据 placeholder/alt 自动生成占位
 *   alt?: string                   - 替代文本（也用于挑选占位图）
 *   placeholder?: string           - 占位图分类关键字，常用："topology" | "network" | "chart" | "device" | "city" | "abstract"
 *   width?: number|string          - 宽（默认 100%）
 *   height?: number|string         - 高（默认 auto）
 *   borderRadius?: number|string   - 圆角，默认 8
 *   objectFit?: string             - 默认 "cover"
 *   background?: string            - 加载/失败兜底色
 */

const { p, escapeAttr } = require("../utils");

// 公共占位图：picsum.photos 支持 seed → 同 seed 永远同图（截图稳定）
function placeholderUrl(seedHint, w, h) {
  const seed = encodeURIComponent(seedHint || "topology");
  const ww = Math.max(64, Number(w) || 480);
  const hh = Math.max(64, Number(h) || 320);
  return `https://picsum.photos/seed/${seed}/${ww}/${hh}`;
}

function normSize(v) {
  if (v == null) return null;
  if (typeof v === "number") return `${v}px`;
  return String(v);
}

function formatRadius(v) {
  if (v == null) return null;
  if (typeof v === "number") return `${v}px`;
  const s = String(v).trim();
  if (/(px|%|em|rem|vh|vw)$/i.test(s)) return s;
  if (/^\d+(?:\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

function Image(props) {
  const src = p(props, "src", null);
  const alt = p(props, "alt", "");
  const placeholder = p(props, "placeholder", null);
  const w = normSize(p(props, "width", "100%"));
  const h = normSize(p(props, "height", null));
  const radius = formatRadius(p(props, "borderRadius", 8));
  const objectFit = p(props, "objectFit", "cover");
  const bg = p(props, "background", "#F1F3F5");

  // 1) 显式 src 优先
  // 2) 没有 src → 用 placeholder 关键字 / alt / 默认 "topology" 拼 picsum URL
  let finalSrc = src;
  if (!finalSrc) {
    const hint = placeholder || alt || "topology";
    // 估算尺寸（picsum 需要 px 整数；w/h 是字符串就给个默认）
    const numW = typeof p(props, "width", null) === "number" ? p(props, "width", null) : 480;
    const numH = typeof p(props, "height", null) === "number" ? p(props, "height", null) : 320;
    finalSrc = placeholderUrl(hint, numW, numH);
  }

  const styleParts = [
    "display:block",
    w ? `width:${w}` : "",
    h ? `height:${h}` : "",
    radius ? `border-radius:${radius}` : "",
    `object-fit:${objectFit}`,
    bg ? `background:${bg}` : "",
    "box-sizing:border-box",
  ].filter(Boolean).join(";");

  return `<img data-hm="Image" src="${escapeAttr(finalSrc)}" alt="${escapeAttr(alt)}" loading="lazy" style="${styleParts}" />`;
}

module.exports = Image;
