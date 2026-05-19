"use strict";
/**
 * FullscreenPanel / Page - 全屏面板容器。两者实现相同，只是语义命名。
 *
 *   Page: 适合"打开一个完整新页面"
 *   FullscreenPanel: 适合"全屏覆盖一个面板"（同样不透明）
 *
 * props:
 *   background?: string    默认 background（#F5F5F5）
 *   width?: string         默认 100%
 *   height?: string        默认 100%
 *   safeAreaTop?: boolean  默认 false（不自动留状态栏空间，由子节点决定）
 *
 * 重点：
 *   - 背景 **永远不透明**（除非显式传 background:"transparent"）
 *   - flex column 布局（StatusBar / NavBar / Tabs / 内容 / 底 Tab 依次堆叠）
 *   - 默认占满父 overlay 容器
 */

const { color: C } = require("../tokens");
const { p } = require("../utils");

function FullscreenPanel(props, childrenHtml) {
  const bg = p(props, "background", C.background);
  const w = p(props, "width", "100%");
  const h = p(props, "height", "100%");
  // position:fixed + inset:0 + z-index:9999 让它真正覆盖整屏，避免被 D2C 父容器
  // 的 absolute / transform / overflow 切割成"窄条"或与原页面骨架并排堆叠（v8
  // test/4 fullpage 重叠的根因 = relative 落在 D2C frame 内部 = 不覆盖）。
  return `<div data-hm="FullscreenPanel" style="position:fixed;inset:0;width:${w};height:${h};display:flex;flex-direction:column;background:${bg};overflow:auto;box-sizing:border-box;z-index:9999;">${childrenHtml}</div>`;
}

module.exports = FullscreenPanel;
