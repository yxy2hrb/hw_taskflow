"use strict";
/**
 * Grid - CSS Grid 网格容器（永远 repeat(N, 1fr)，永远不会写错括号）。
 *
 * props:
 *   columns: number       必填（2 / 3 / 4 最常见）
 *   gap?: number          默认 16
 *   padding?: number|number[]  默认 [24, 16]（垂直 24 / 水平 16）
 *   rowGap?: number       覆盖 gap
 *   columnGap?: number    覆盖 gap
 */

const { spacing: S } = require("../tokens");
const { p, padding } = require("../utils");

function Grid(props, childrenHtml) {
  const cols = Math.max(1, Number(props.columns || 3));
  const gap = p(props, "gap", S.lg);
  const rowGap = p(props, "rowGap", gap);
  const columnGap = p(props, "columnGap", gap);
  const pad = padding(p(props, "padding", [S.xl, S.lg])) || `${S.xl}px ${S.lg}px`;

  return `<div data-hm="Grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);row-gap:${rowGap}px;column-gap:${columnGap}px;padding:${pad};box-sizing:border-box;">${childrenHtml}</div>`;
}

module.exports = Grid;
