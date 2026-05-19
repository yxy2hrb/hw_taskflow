"use strict";
/**
 * Icon - HM Symbol（优先）+ Material Icons Round（兜底）双路径渲染。
 *
 * props:
 *   name: string         - 图标名（Material 风格或鸿蒙原生名）
 *   size?: number        - 字号 px（默认 24）
 *   color?: string       - 颜色（默认 textPrimary）
 *
 * 实际字符替换 + @font-face 注入复用 hmComponentExpander 的逻辑：
 *   - 这里只输出 <span class="mi" style="...">name</span>
 *   - 由 ensureIconFontInjected 注入 @font-face；
 *   - 由 hmComponentExpander.injectIconFontIfNeeded （在 expandHmTags 阶段）
 *     把 Material 名映射为 HM Symbol 字符（如 "delete" → PUA 字符）。
 *
 * 但 DSL 编译路径不一定经过 expandHmTags，所以这里也提供一个
 * 兜底的 injectIconFontIfNeeded（仅注入字体，名字映射可选）。
 */

const { color: C, font: F } = require("../tokens");
const { escapeHtml, normalizeIconName } = require("../utils");

function Icon(props, _children, _ctx) {
  const name = normalizeIconName(props.name);
  if (!name) return "";
  const size = Number(props.size || 24);
  const col = props.color || C.iconPrimary;
  // 把 name 直接当作 .mi 的 innerText，由字体的 liga 渲染。
  return `<span class="mi" style="font-size:${size}px;color:${col};line-height:1;">${escapeHtml(name)}</span>`;
}

Icon.propsSchema = {
  name: { type: "string", required: true, description: "图标名" },
  size: { type: "number", default: 24, description: "字号" },
  color: { type: "string", default: C.iconPrimary, description: "颜色" },
};

/**
 * 给整页 HTML 注入鸿蒙图标字体 @font-face + .mi/.hm-icon class。
 * 已注入则跳过。
 *
 * 兼容 hmComponentExpander.injectIconFontIfNeeded 的产物，避免双重注入。
 */
function ensureIconFontInjected(html, assetPrefix) {
  if (typeof html !== "string") return html;
  if (html.includes('id="hm-icon-font"')) return html;
  if (!/class\s*=\s*["'][^"']*\bmi\b[^"']*["']/.test(html)) return html;
  const css = [
    '<style id="hm-icon-font">',
    "@font-face{",
    "  font-family:'HMSymbol';font-style:normal;font-weight:400;",
    `  src:url('${assetPrefix}/_fonts/HMSymbolVF.ttf') format('truetype');`,
    "}",
    "@font-face{",
    "  font-family:'Material Icons Round';font-style:normal;font-weight:400;",
    `  src:url('${assetPrefix}/_fonts/material-icons-round.woff2') format('woff2');`,
    "}",
    ".mi{",
    "  font-family:'HMSymbol','Material Icons Round',sans-serif;",
    "  font-weight:normal;font-style:normal;",
    "  display:inline-block;line-height:1;",
    "  text-transform:none;letter-spacing:normal;word-wrap:normal;white-space:nowrap;",
    "  direction:ltr;",
    "  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;",
    "  -moz-osx-font-smoothing:grayscale;",
    "  font-feature-settings:'liga';",
    "}",
    ".hm-icon{font-family:'HMSymbol',sans-serif;}",
    "</style>",
  ].join("\n");

  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, css + "\n</head>");
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + "\n<head>" + css + "</head>");
  return css + "\n" + html;
}

module.exports = Icon;
module.exports.ensureIconFontInjected = ensureIconFontInjected;
