"use strict";
/**
 * HMRoot / HMNode 校验。
 * 返回 { ok: true } 或 { ok: false, reason }。
 */

const LIFECYCLES = new Set(["temporary", "persistent"]);
const INJECTION_MODES = new Set(["overlay", "replace", "append"]);

class HMDslError extends Error {
  constructor(message, path) {
    super(message);
    this.name = "HMDslError";
    this.path = path || null;
  }
}

function validateRoot(root, registry) {
  if (!root || typeof root !== "object") return fail("root 必须是对象");
  if (!root.state_name || typeof root.state_name !== "string") return fail("root.state_name 必填且为 string");
  if (!LIFECYCLES.has(root.lifecycle)) return fail(`root.lifecycle 必须是 ${[...LIFECYCLES].join("|")}`);
  if (!root.injection || !INJECTION_MODES.has(root.injection.mode)) return fail(`root.injection.mode 必须是 ${[...INJECTION_MODES].join("|")}`);
  if ((root.injection.mode === "replace" || root.injection.mode === "append") && !root.injection.anchor) {
    return fail(`root.injection.anchor 在 mode=${root.injection.mode} 时必填`);
  }
  // root.tree 允许缺省（如"无变化"的 cancel 态）—— 编译时直接复用 base
  if (root.tree == null) return { ok: true, noop: true };
  const t = validateNode(root.tree, registry, ["tree"]);
  if (!t.ok) return t;
  return { ok: true };
}

function validateNode(node, registry, path) {
  if (typeof node === "string") return { ok: true }; // 文本节点
  if (!node || typeof node !== "object") return fail(`${joinPath(path)} 必须是对象或字符串`);
  if (!node.type || typeof node.type !== "string") return fail(`${joinPath(path)}.type 必填且为 string`);
  if (!registry || !registry[node.type]) return fail(`${joinPath(path)}.type="${node.type}" 不是已注册组件`);
  if (node.props != null && typeof node.props !== "object") return fail(`${joinPath(path)}.props 必须是对象`);
  if (node.children != null) {
    if (typeof node.children === "string") return { ok: true };
    if (!Array.isArray(node.children)) return fail(`${joinPath(path)}.children 必须是数组或字符串`);
    for (let i = 0; i < node.children.length; i++) {
      const r = validateNode(node.children[i], registry, [...path, `children[${i}]`]);
      if (!r.ok) return r;
    }
  }
  return { ok: true };
}

function fail(reason) { return { ok: false, reason }; }
function joinPath(arr) { return arr && arr.length ? arr.join(".") : "(root)"; }

module.exports = { validateRoot, validateNode, HMDslError };
