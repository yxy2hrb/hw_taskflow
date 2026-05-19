"use strict";
/**
 * HM 组件 DSL · 编译器主入口。
 *
 * 用法：
 *   const { compileTree } = require("./compile");
 *   const { html, warnings } = compileTree(root, baseHtml, { stateId: 5, log });
 *
 * 失败时抛 HMDslError，调用方应该 try/catch 后回落到旧 [OLD]/[NEW] 路径。
 */

const { validateRoot, HMDslError } = require("./validate");
const { makeRender } = require("./render");
const { injectIntoBase } = require("./inject");
const components = require("./components");
const { ensureIconFontInjected } = require("./components/Icon");

function compileTree(root, baseHtml, ctx = {}) {
  const log = ctx.log || (() => {});

  // 1. 校验
  const v = validateRoot(root, components);
  if (!v.ok) throw new HMDslError(`DSL 校验失败：${v.reason}`);

  // noop（无 tree 字段，如"取消态"）→ 直接返回 base
  if (v.noop) {
    log(`[dsl] noop（root.tree 缺省），直接复用 base HTML`);
    return { html: baseHtml, warnings: ["noop:tree missing"] };
  }

  // 2. 渲染组件树
  const warnings = [];
  const renderCtx = {
    stateId: ctx.stateId,
    assetPrefix: ctx.assetPrefix || "_hm-assets",
    warnings,
    log,
  };
  const render = makeRender(components);
  const rendered = render(root.tree, renderCtx);

  // 3. 注入 base（含任务节点注释包裹）
  let injected = injectIntoBase(baseHtml, rendered, root, renderCtx);

  // 4. 确保 Icon 字体被注入（含 HMSymbolVF.ttf + Material Icons Round 双路径）
  injected = ensureIconFontInjected(injected, renderCtx.assetPrefix);

  log(`[dsl] compile ok · state="${root.state_name}" · ${rendered.length}B rendered`);
  return { html: injected, warnings };
}

module.exports = { compileTree, HMDslError };
