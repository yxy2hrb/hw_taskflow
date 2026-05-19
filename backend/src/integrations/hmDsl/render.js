"use strict";
/**
 * 递归把 HMNode 渲染成 HTML 字符串。每个组件就是一个
 * `(props, childrenHtml, ctx) => htmlString` 的纯函数。
 */

const { escapeHtml } = require("./utils");
const { HMDslError } = require("./validate");

// 节点上不属于 props 的保留字段
const RESERVED = new Set(["type", "props", "children", "key", "_comment"]);

/**
 * 容错地从节点上提取 props：
 *   - 优先用 node.props
 *   - 同时把 node 上除保留字段外的任意字段也合并进来（LLM 经常把 icon/label 等
 *     直接平铺到节点根上）。最终：扁平字段 + props 字段。props 字段优先。
 */
function extractProps(node) {
  const flat = {};
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      if (!RESERVED.has(k)) flat[k] = node[k];
    }
  }
  const nested = (node && typeof node.props === "object" && node.props) ? node.props : {};
  return { ...flat, ...nested };
}

function makeRender(registry) {
  function render(node, ctx) {
    if (node == null) return "";
    if (typeof node === "string") return escapeHtml(node);
    if (!node.type) return "";

    const Component = registry[node.type];
    if (!Component) throw new HMDslError(`未知组件类型: ${node.type}`);

    const childrenHtml = Array.isArray(node.children)
      ? node.children.map(c => render(c, ctx)).join("")
      : typeof node.children === "string"
      ? escapeHtml(node.children)
      : "";

    const props = extractProps(node);
    return Component(props, childrenHtml, { ...ctx, render });
  }
  return render;
}

module.exports = { makeRender };
