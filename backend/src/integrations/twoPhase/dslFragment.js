// ──────────────────────────────────────────────────────────────────────
// twoPhase 专用：DSL Fragment 编译器
//
// 作用：把 Skill 2 给出的 HMNode JSON 片段编译成 HTML 字符串。
// 这里**不调** hmDsl/compile.js 的 compileTree —— 那个跑的是"全屏 root 注入"流程，
// 会自己往 baseHtml 里插入；我们需要更原子的"只渲染 fragment"，由 patcher 自己
// 包注释、装 [OLD]/[NEW] 块。
//
// 同时复用 hmDsl 的 components/validate/render/ensureIconFontInjected：
//   - validateNode：保证 LLM 给的 tree 至少结构合法、type 存在于注册表
//   - makeRender：递归把 tree 渲染成 HTML
//   - ensureIconFontInjected：保证页面有 HM Symbol + Material Icons 字体
// ──────────────────────────────────────────────────────────────────────
"use strict";

const components = require("../hmDsl/components");
const { makeRender } = require("../hmDsl/render");
const { validateNode, HMDslError } = require("../hmDsl/validate");
const { ensureIconFontInjected } = require("../hmDsl/components/Icon");

const render = makeRender(components);

/**
 * 编译一个 HMNode 片段为 HTML 字符串。
 *
 * @param {object} tree         - HMNode（一定要带 type 字段）
 * @param {object} [opts]
 * @param {number} [opts.stateId]
 * @param {string} [opts.assetPrefix="_hm-assets"]
 * @param {Function} [opts.log]
 * @returns {{ html: string, warnings: string[] }}
 *
 * 失败抛 HMDslError；调用方决定如何兜底。
 */
function compileDslFragment(tree, opts = {}) {
  if (!tree || typeof tree !== "object") {
    throw new HMDslError("DSL tree 不是对象");
  }
  if (!tree.type || typeof tree.type !== "string") {
    throw new HMDslError("DSL tree 缺少 type 字段");
  }
  const v = validateNode(tree, components, ["tree"]);
  if (!v.ok) {
    throw new HMDslError(`DSL tree 校验失败：${v.reason}`);
  }
  const warnings = [];
  const ctx = {
    stateId: opts.stateId,
    assetPrefix: opts.assetPrefix || "_hm-assets",
    warnings,
    log: opts.log || (() => {}),
  };
  const html = render(tree, ctx);
  return { html, warnings };
}

/**
 * 把"任务节点开始/结束"注释包到一段 HTML 外面。stateName 为空时直接返回 raw。
 * lifecycleTag 默认 "【临时】"——对 overlay / dialog / toast 用；
 * 持久化变化（state-toggle 实现"已开/已关"）用 "【持久】"。
 */
function wrapWithTaskComment(html, stateName, lifecycleTag = "【临时】") {
  if (!stateName) return html;
  return (
    `\n<!-- 任务节点开始: ${stateName}${lifecycleTag} -->\n` +
    html +
    `\n<!-- 任务节点结束: ${stateName}${lifecycleTag} -->\n`
  );
}

module.exports = {
  compileDslFragment,
  ensureIconFontInjected,
  wrapWithTaskComment,
  HMDslError,
};
