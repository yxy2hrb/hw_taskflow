"use strict";
/**
 * 渲染期常用工具：转义 / 内联 style 拼接 / class 拼接 / props 取值。
 */

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) { return escapeHtml(s); }

/** 把对象转成 inline style 字符串。值为 number 时按需加 px。 */
function style(obj) {
  if (!obj) return "";
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === false || v === "") continue;
    // camelCase → kebab-case
    const key = k.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
    let val = v;
    if (typeof v === "number" && NUMERIC_UNITLESS.has(key) === false) val = `${v}px`;
    parts.push(`${key}:${val}`);
  }
  return parts.join(";");
}

// 不需要 px 单位的 CSS 属性
const NUMERIC_UNITLESS = new Set([
  "z-index", "opacity", "font-weight", "flex", "flex-grow", "flex-shrink",
  "line-height", "order", "tab-size",
]);

function cn(...args) {
  return args.filter(Boolean).join(" ");
}

/** 把 [top, right, bottom, left] 或 [v, h] 或 number 转成"npx mpx kpx jpx"。 */
function padding(v) {
  if (v == null) return null;
  if (typeof v === "number") return `${v}px`;
  if (!Array.isArray(v)) return String(v);
  return v.map(n => (typeof n === "number" ? `${n}px` : n)).join(" ");
}

/** 安全读 props，带默认值。 */
function p(props, key, defaultVal) {
  if (!props || props[key] == null) return defaultVal;
  return props[key];
}

/**
 * 把 LLM 给的 icon prop 归一化为字符串图标名（或 null）。
 *
 * 接受的输入形式：
 *   - "arrow_drop_down"                                          → "arrow_drop_down"
 *   - { name: "arrow_drop_down", size?, color? }                  → "arrow_drop_down"
 *   - { type: "Icon", props: { name: "arrow_drop_down", ... } }   → "arrow_drop_down"  (LLM 经常这样给)
 *   - null / undefined / "" / {} / 任意非法值                       → null
 *
 * 这是为了防止之前出现的事故：组件直接 `escapeHtml(iconObj)` 把对象拼成
 * "[object Object]" 后丢进 Material Icons 字体，渲染成乱码字符。
 */
function normalizeIconName(v) {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  if (typeof v === "object") {
    if (typeof v.name === "string" && v.name.trim()) return v.name.trim();
    if (v.props && typeof v.props === "object" && typeof v.props.name === "string" && v.props.name.trim()) {
      return v.props.name.trim();
    }
  }
  return null;
}

module.exports = { escapeHtml, escapeAttr, style, cn, padding, p, normalizeIconName };
