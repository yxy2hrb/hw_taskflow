"use strict";
/**
 * patchOneStateViaDsl - DSL 路径的 patchOneState 替代实现。
 *
 * 同 patchOneState 的签名，返回相同的 { html, applied, skipped, raw, hmExpansions, hmMissing, review, reviewApplied }。
 *
 * 流程：
 *   1) buildDslPrompt → 调 callText → parseDslResponse 得到 HMRoot
 *   2) compileTree(root, prevHtml) 得到 patched HTML
 *   3) 不需要 expandHmTags（编译器已经直出 HMSymbol）
 *   4) 不需要后处理（编译器输出的 CSS/HTML 都是正确的）
 *   5) （可选）vision review 仍可走（截图 → qwen-vl-max 评审）
 *
 * 失败抛 Error。上层应当 try/catch 后回落到 patchOneStateLegacy。
 */

const { buildDslPrompt, parseDslResponse } = require("./skill");
const { compileTree, HMDslError } = require("./compile");
const { stripChromeFromTree } = require("../twoPhase/stripChrome");

// 检测"成功/失败 Toast"特征：Row 含 (check|error|info) icon + 提示文字
// 后面紧跟 close icon → close icon 是 LLM 自加的关闭按钮，应剔除。
// 递归扫整个 tree，返回剔除的 close 个数。
const TOAST_LEAD_ICONS = new Set([
  "check", "check_circle", "check_circle_outline",
  "error", "error_outline", "warning", "warning_amber",
  "info", "info_outline", "task_alt",
]);
// F20：在 tree 内寻找"Toast row"（leadIcon + Text + 圆角矩形 + 背景 + 高 ≤ 56），
// 找到后把它最近的 Column 父级改为 `justify:flex-start` + `padding-top:48`。
function floatToastToTop(node, parentColumn = null) {
  if (!node || typeof node !== "object") return 0;
  let count = 0;
  const isColumn = node.type === "Column" || node.type === "FullscreenPanel" || node.type === "OverlayMask";
  const nextParent = isColumn ? node : parentColumn;

  // 识别"Toast row"特征：Row + children 含 leadIcon + Text + 自带 background 或 borderRadius
  if (node.type === "Row" && Array.isArray(node.children) && node.children.length >= 2 && parentColumn) {
    const lead = node.children[0];
    const leadName = lead && lead.type === "Icon" && lead.props && lead.props.name;
    const hasText = node.children.some(c => c && c.type === "Text");
    const looksLikeToast =
      leadName && TOAST_LEAD_ICONS.has(String(leadName)) && hasText &&
      node.props && (node.props.background || node.props.borderRadius);
    const heightOk = !node.props || !node.props.height || Number(node.props.height) <= 56;
    if (looksLikeToast && heightOk) {
      parentColumn.props = parentColumn.props || {};
      // 强制顶部对齐 + 给状态栏让出 48px 空间
      parentColumn.props.justify = "flex-start";
      if (!parentColumn.props.paddingTop && !parentColumn.props.padding) {
        parentColumn.props.paddingTop = 48;
      } else if (typeof parentColumn.props.padding === "number" && parentColumn.props.padding < 48) {
        parentColumn.props.paddingTop = 48;
      }
      count++;
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      count += floatToastToTop(child, nextParent);
    }
  }
  return count;
}

function stripCloseIconFromToast(node) {
  if (!node || typeof node !== "object") return 0;
  let removed = 0;
  if (Array.isArray(node.children)) {
    // 若本节点是 Row 且 children 形如 [leadIcon, ...text, closeIcon] → 去掉 closeIcon
    if (node.type === "Row" && node.children.length >= 2) {
      const lead = node.children[0];
      const tail = node.children[node.children.length - 1];
      const leadName = lead && lead.type === "Icon" && lead.props && lead.props.name;
      const tailName = tail && tail.type === "Icon" && tail.props && tail.props.name;
      const looksLikeToast = leadName && TOAST_LEAD_ICONS.has(String(leadName));
      const tailIsClose = tailName === "close" || tailName === "cancel" || tailName === "clear";
      if (looksLikeToast && tailIsClose) {
        node.children = node.children.slice(0, -1);
        removed++;
      }
    }
    for (const child of node.children) {
      removed += stripCloseIconFromToast(child);
    }
  }
  return removed;
}

async function patchOneStateViaDsl({
  prevHtml,
  currentReq,
  allRequirements,
  log,
  assetPrefix,
  llmDeps,  // 必须传入 { callText, callVisionJSON? }
}) {
  if (!llmDeps || typeof llmDeps.callText !== "function") {
    throw new Error("patchOneStateViaDsl 需要 llmDeps.callText");
  }
  const stateId = currentReq.state_id;
  const stateName = currentReq.state_name || `state_${stateId}`;
  log && log(`[dsl] 准备走 DSL 路径：${stateName}`);

  const prompt = buildDslPrompt({ currentReq, allRequirements });
  log && log(`[dsl] prompt ${(prompt.length / 1024).toFixed(1)}KB → callText…`);

  // 把 LLM 调用 + JSON 解析放在同一个重试循环里：
  //   - 空返回 → 重试
  //   - JSON 解析失败（jsonrepair 也修不好）→ 重试
  // 第二次拉高 temperature 制造扰动，避免 LLM 给出同一段不合法 JSON。
  let raw = "";
  let root = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const temperature = attempt === 1 ? 0 : 0.4;
    let r;
    try {
      r = await llmDeps.callText("", prompt, { temperature });
    } catch (e) {
      lastErr = e;
      log && log(`[dsl] 第 ${attempt} 次 LLM 异常：${e.message || e}，${attempt < 2 ? "重试…" : "放弃"}`);
      continue;
    }
    if (typeof r !== "string" || !r.trim()) {
      lastErr = new Error("LLM 返回空");
      log && log(`[dsl] 第 ${attempt} 次 LLM 返回空，${attempt < 2 ? "重试…" : "放弃"}`);
      continue;
    }
    raw = r;
    try {
      root = parseDslResponse(r);
      break;  // 成功
    } catch (e) {
      lastErr = e;
      log && log(`[dsl] 第 ${attempt} 次 JSON 解析失败：${e.message}，${attempt < 2 ? "重试 (temperature=0.4)…" : "放弃"}`);
    }
  }
  if (!root) {
    if (!raw) throw new Error("LLM 多次返回空");
    throw new Error(`DSL JSON 解析失败：${lastErr ? lastErr.message : "未知"}`);
  }

  // 兜底：DSL 降级路径 injection.mode=overlay 已经把内容包在全屏 fixed 容器里，
  // 若 LLM 在 tree 里再画 Page+StatusBar+NavBar+BottomTab，base chrome 会被双层覆盖
  // （v28 new_test/5 state_3 双状态栏事故根因）。这里剥离 chrome：
  //   - Page/FullscreenPanel → Column
  //   - 移除 StatusBar / NavBar / BottomTab / TabBar
  const injectionMode = (root && root.injection && root.injection.mode) || "overlay";
  if (injectionMode === "overlay" && root && root.tree) {
    const before = JSON.stringify(root.tree).length;
    root.tree = stripChromeFromTree(root.tree);
    const after = JSON.stringify(root.tree).length;
    if (after < before) {
      log && log(`[dsl] 剥离 chrome（Page→Column / 移除 StatusBar/NavBar/BottomTab），${before}→${after}B`);
    }
  }

  // F13 兜底：DSL 路径不走 twoPhase 的 normalizeSuccessToastTree，
  // 但仍要修掉常见错误——Toast / Snackbar Row 里被 LLM 自作主张加 close 图标
  // （v29 new_test/2 state_5 截图"✓ 创建成功 ✕" 的尾部 ✕ 根因）。
  // Toast 是临时浮层，应自动消失，不该有用户主动关闭按钮。
  if (root && root.tree) {
    const removed = stripCloseIconFromToast(root.tree);
    if (removed > 0) log && log(`[dsl] 剥离 Toast/Snackbar 内的 ${removed} 个 close 图标（多余的关闭按钮）`);
  }

  // F20 兜底：DSL overlay 路径下，若 LLM 用 OverlayMask[opacity:0] + Column 包 Toast row，
  // Toast 容易出现在 viewport 中部（Column 默认 justify:center）而不是顶部 16px 处
  // （v32 new_test/2 state_4 翻车：Toast "✓ 创建成功" 浮在卡片中部 y=500 而非状态栏下方）。
  // 修：检测到 Toast row（顶层 leadIcon + Text + 圆角矩形 +背景 + height ≤ 56），
  // 自动给容器 Column 加 `justify:flex-start` + `padding-top:48`，确保 Toast 贴近顶部。
  if (root && root.tree && injectionMode === "overlay") {
    const adjusted = floatToastToTop(root.tree);
    if (adjusted > 0) log && log(`[dsl] 调整 ${adjusted} 个 Toast 容器为顶部对齐（padding-top:48 让 toast 贴 status bar）`);
  }

  // 编译
  const { html, warnings } = compileTree(root, prevHtml, {
    stateId,
    assetPrefix: assetPrefix || "_hm-assets",
    log: (m) => log && log(`[dsl] ${m}`),
  });

  return {
    html,
    applied: 1,
    skipped: 0,
    raw,
    hmExpansions: 0,
    hmMissing: [],
    review: null,
    reviewApplied: 0,
    dsl: { root, warnings },
  };
}

module.exports = { patchOneStateViaDsl, HMDslError };
