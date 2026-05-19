"use strict";
/**
 * Checkbox - 方形复选框；checked 时蓝底白对勾。
 *
 * props:
 *   checked?: boolean    默认 false
 *   size?: number        默认 22
 *   color?: string       默认 primary
 */

const { color: C } = require("../tokens");
const { p } = require("../utils");

function Checkbox(props) {
  const checked = !!p(props, "checked", false);
  const size = Number(p(props, "size", 22));
  const col = p(props, "color", C.primary);

  if (!checked) {
    return `<span data-hm="Checkbox" style="display:inline-block;width:${size}px;height:${size}px;border:2px solid ${C.border};border-radius:4px;background:#fff;box-sizing:border-box;"></span>`;
  }
  return `<span data-hm="Checkbox" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:4px;background:${col};color:#fff;box-sizing:border-box;"><span class="mi" style="font-size:${Math.floor(size * 0.75)}px;color:#fff;">check</span></span>`;
}

module.exports = Checkbox;
