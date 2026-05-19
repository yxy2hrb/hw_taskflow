"use strict";
/**
 * Text - 文本节点。
 *
 * props:
 *   text?: string         文本内容（如不传则用 children）
 *   size?: number         默认 14
 *   weight?: number       默认 400
 *   color?: string        默认 textPrimary
 *   align?: "left"|"center"|"right"  默认 "left"
 *   variant?: "title"|"subtitle"|"body"|"caption"  快捷预设
 */

const { color: C, font: F } = require("../tokens");
const { p, escapeHtml } = require("../utils");

const VARIANT = {
  title:    { size: F.sizeXl,  weight: F.weightSemibold, color: C.textPrimary },
  subtitle: { size: F.sizeLg,  weight: F.weightMedium,   color: C.textPrimary },
  body:     { size: F.sizeMd,  weight: F.weightRegular,  color: C.textPrimary },
  caption:  { size: F.sizeSm,  weight: F.weightRegular,  color: C.textSecondary },
};

function Text(props, childrenHtml) {
  const variant = p(props, "variant", null);
  const v = variant ? VARIANT[variant] || VARIANT.body : VARIANT.body;
  const size = Number(p(props, "size", v.size));
  const weight = Number(p(props, "weight", v.weight));
  const col = p(props, "color", v.color);
  const align = p(props, "align", "left");
  const text = p(props, "text", null);
  const content = text != null ? escapeHtml(text) : childrenHtml;

  return `<span data-hm="Text" style="font-family:${F.family};font-size:${size}px;font-weight:${weight};color:${col};text-align:${align};line-height:1.4;">${content}</span>`;
}

module.exports = Text;
