"use strict";
/**
 * stripChrome - 共享工具：剥离 LLM 在 DSL tree 里误画的 chrome。
 *
 * 触发场景：
 *   - state-toggle 类型：是"在 base 里替换某段子 frame"，绝不应全屏 fixed 覆盖。
 *     LLM 仍按"全屏页"思路给 Page + StatusBar + NavBar + 主体 + BottomTab → 会盖死 base 底导。
 *   - DSL 降级 overlay 模式：injection.mode=overlay 已经把 LLM 输出包在全屏 fixed 容器里，
 *     LLM 再画一遍 Page/StatusBar/NavBar/BottomTab 就是"重复全屏"，把 base chrome 全盖死。
 *
 * 后端确定性后处理：
 *   1) 根 Page/FullscreenPanel → Column（去掉全屏覆盖效果）
 *   2) 移除 children 里的 StatusBar / NavBar / BottomTab / TabBar（base 已有）
 *
 * 旧事故：
 *   - v23/24 new_test/4：multi-selector LLM 重画 chrome 覆盖底导 → 加 strip
 *   - v26 new_test/2 state_2：单 selector 同问题 → strip 扩展到 selector
 *   - v28 new_test/5 state_3：DSL 降级路径绕过 strip → 这次再扩展到 DSL fallback
 */

const CHROME = new Set(["StatusBar", "NavBar", "BottomTab", "TabBar"]);

function stripChromeFromTree(tree) {
  if (!tree || typeof tree !== "object") return tree;
  const rootIsPage = tree.type === "Page" || tree.type === "FullscreenPanel";
  if (rootIsPage) {
    tree.type = "Column";
    tree.props = tree.props || {};
    delete tree.props.position;
    delete tree.props.height;
    delete tree.props.minHeight;
    if (!tree.props.width) tree.props.width = "100%";
    if (!tree.props.gap && tree.props.gap !== 0) tree.props.gap = 0;
  }
  if (Array.isArray(tree.children)) {
    tree.children = tree.children.filter(c => c && !CHROME.has(c.type));
  }
  return tree;
}

module.exports = { stripChromeFromTree };
