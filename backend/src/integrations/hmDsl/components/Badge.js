"use strict";
/**
 * Badge - 小红点/数字徽标，独立组件（通常应作为 append 模式贴在 base 内某元素旁边）。
 *
 * props:
 *   count?: number       如有则显示数字；否则显示纯红点
 *   color?: string       默认 warning（#E84026）
 *   size?: number        默认 12（纯点）或 16（带数字）
 *   offsetTop?: number   绝对定位偏移
 *   offsetRight?: number 绝对定位偏移
 *
 * 渲染：
 *   - 纯点：12×12 圆
 *   - 带数字：自适应宽度的胶囊
 *   - 默认 position:absolute；如果不在父容器里，请保证父容器有 position:relative
 */

const { color: C, font: F } = require("../tokens");
const { p, escapeHtml } = require("../utils");

function Badge(props) {
  const count = p(props, "count", null);
  const col = p(props, "color", C.warning);
  const size = Number(p(props, "size", count == null ? 12 : 16));
  const top = Number(p(props, "offsetTop", 4));
  const right = Number(p(props, "offsetRight", -6));

  const base = `position:absolute;top:${top}px;right:${right}px;background:${col};color:#fff;border-radius:9999px;`;

  if (count == null) {
    return `<span data-hm="Badge" style="${base}width:${size}px;height:${size}px;display:inline-block;"></span>`;
  }

  return `<span data-hm="Badge" style="${base}min-width:${size}px;height:${size}px;padding:0 4px;display:inline-flex;align-items:center;justify-content:center;font-family:${F.family};font-size:10px;font-weight:${F.weightMedium};line-height:1;box-sizing:border-box;">${escapeHtml(count)}</span>`;
}

module.exports = Badge;
