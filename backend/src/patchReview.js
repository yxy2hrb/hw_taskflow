"use strict";
/**
 * 截图 → Vision 评审。
 *
 * 在 patchOneState 完成首轮 apply 后调用：
 *   1) 把当前已应用补丁的完整 HTML 渲染成 PNG（默认 360×780, fullPage）
 *   2) 把截图（base64）+ 当前 state 描述 + LLM 原始 [OLD]/[NEW] 输出，喂给 qwen-vl-max
 *   3) 评审模型返回 JSON: { ok, issues, fixedBlocks }
 *      - ok=true  → 通过；
 *      - ok=false → 只记录 issues / fixedBlocks 建议，不再自动修改 HTML。
 *
 * 这是"防溢出 / 防语言不一致 / 防视觉异常"的评审关；是否修复交给后续人工或单独策略。
 */

const fs = require("fs");
const path = require("path");
const { screenshotHtmlString } = require("./integrations/htmlScreenshot");
const { detectLanguage } = require("./taskflowPatch");

const REVIEW_SYSTEM = `你是一名资深移动端 UI 设计师 + QA 评审员，熟悉 HarmonyOS Design 规范。
你只会输出严格的 JSON 对象，不写任何自然语言解释。`;

function buildReviewPrompt({ currentReq, html, prevBlocksRaw, langInfo }) {
  return `下面是某个任务流 state 应用补丁后的当前 HTML（截图见随附图像）。请仅基于截图和需求做"视觉合理性评审"。

==================【当前任务需求】==================
${JSON.stringify({
  state_id: currentReq.state_id,
  state_name: currentReq.state_name,
  description: currentReq.description,
  implementation_method: currentReq.implementation_method,
  last_state: currentReq.last_state,
}, null, 2)}

==================【原页面主语言（自动检测）】==================
主语言: ${langInfo.primary}（中文字符 ${langInfo.cn}, 英文词块 ${langInfo.en}）
${langInfo.hint}

==================【上一轮模型输出（[OLD]/[NEW] 替换块）】==================
${prevBlocksRaw}

==================【应用补丁后的完整 HTML（用于 [OLD] 锚定）】==================
${html}

==================【评审清单 - 必须逐项检查】==================
1) **语言一致性**：截图中"新生成的可见文字"是否和原页面的主语言一致？
   - 主语言=en 时，新弹窗/Toast/按钮**必须用英文**；如果出现"取消"/"确认"/"不可撤销"等中文，**判 fail**。
   - 主语言=zh 时，新文案必须用中文。
2) **元素溢出**：截图中是否有任何文字 / 按钮被弹窗或卡片右/下边界裁掉？
   - 弹窗正文超出容器右边界 → fail；
   - 按钮文字被截断 / 折行折到不合理位置 → fail；
   - 弹窗本身超出 360px 画布 → fail。
3) **可见性**：description 期望显示的元素是否真的可见？
   - description 说"原 X 按钮变为 Y" 但截图里 X 还是原样 → fail；
   - description 说"弹出 Dialog" 但截图里没有遮罩 + 弹窗 → fail；
   - description 说"Toast 顶部居中" 但截图里没看到 Toast → fail。
4) **位置合理性**：覆盖类元素是否处在视觉合理位置？
   - "封面图右上角的按钮"被画到状态栏 → fail；
   - 弹窗居中遮罩缺失 / 没有居中 → fail。
5) **基础样式**：是否出现纯黑底/纯白文字、超粗阴影、奇怪字体等违反鸿蒙规范的视觉？

==================【输出 JSON 格式（严格）】==================
{
  "ok": true | false,
  "issues": ["简短描述每个问题，包含定位"],
  "fixedBlocks": "若 ok=false，则给出新的 [OLD]/[NEW] 替换块字符串；ok=true 时为空字符串"
}

fixedBlocks 严格要求（仅 ok=false 时填）：
- 格式：[OLD]\\n<原片段，必须是当前 HTML 的逐字片段>\\n[NEW]\\n<修订后的片段>\\n （可多对）
- [OLD] 必须能在【应用补丁后的完整 HTML】里找到一字不差的子串；
- 优先**就地修订**已有片段（缩短文本、加 max-width、改语言、调位置），而不是再放新浮层；
- ❌ 禁止在 [NEW] 中包 \`<div data-temp-hide="1" style="display:none">\`；
- ❌ 禁止用 [HM:Tag] 占位标签（占位标签本轮已展开成 D2C HTML，再次输出反而无效）；
- 只输出 JSON，不要写多余文字。`;
}

/**
 * 跑一轮"截图 → vision 评审 → 必要时修订 → 再 apply"。
 *
 * @param {object} args
 * @param {string} args.html         当前已 apply 补丁的完整 HTML
 * @param {object} args.currentReq   当前 state 需求
 * @param {string} args.prevBlocksRaw 模型原始 [OLD]/[NEW] 输出
 * @param {string} args.baseDir      用于截图的基目录（让相对资源能解析）
 * @param {object} args.deps         { callVisionJSON }
 * @param {function} args.log
 * @param {string} args.screenshotPath 可选：把截图持久化到这个路径（便于审计）
 * @returns {Promise<{ html, applied, skipped, review, screenshotBytes }>}
 */
async function reviewAndFix({ html, currentReq, prevBlocksRaw, baseDir, deps, log, screenshotPath }) {
  if (!deps?.callVisionJSON) {
    log && log("[review] callVisionJSON 不可用，跳过 review 阶段");
    return { html, applied: 0, skipped: 0, review: null };
  }

  log && log("[review] 渲染截图…");
  const shot = await screenshotHtmlString(html, { baseDir, waitMs: 700, maxHeight: 4500 });
  if (!shot.ok) {
    log && log(`[review] 截图失败：${shot.reason}，跳过 review`);
    return { html, applied: 0, skipped: 0, review: null };
  }
  log && log(`[review] 截图 ${shot.buffer.length} 字节, H=${shot.height}px, ${shot.ms}ms`);

  if (screenshotPath) {
    try { fs.mkdirSync(path.dirname(screenshotPath), { recursive: true }); fs.writeFileSync(screenshotPath, shot.buffer); }
    catch (e) { log && log(`[review] 截图持久化失败：${e.message}`); }
  }

  const dataUrl = "data:image/png;base64," + shot.buffer.toString("base64");
  const langInfo = detectLanguage(html);

  log && log(`[review] 调用 vision 评审模型（lang=${langInfo.primary}）`);
  const t0 = Date.now();
  const result = await deps.callVisionJSON(REVIEW_SYSTEM,
    buildReviewPrompt({ currentReq, html, prevBlocksRaw, langInfo }),
    [dataUrl]
  );
  const reviewMs = Date.now() - t0;

  if (!result || typeof result !== "object") {
    log && log(`[review] 模型未返回有效 JSON（${reviewMs}ms），标记 review_unavailable`);
    return { html, applied: 0, skipped: 0, review: null, screenshotBytes: shot.buffer.length };
  }
  log && log(`[review] ok=${result.ok} issues=${(result.issues || []).length} (${reviewMs}ms)`);
  if (Array.isArray(result.issues)) result.issues.forEach((it, i) => log && log(`  · ${i + 1}. ${it}`));

  if (result.ok !== true && result.fixedBlocks) {
    log && log("[review] 模型给出了 fixedBlocks，但当前策略为 review-only，忽略自动修改");
  }
  return {
    html,
    applied: 0,
    skipped: 0,
    review: {
      ...result,
      reviewMs,
      screenshot: shot.buffer.length,
      reviewOnly: true,
      fixedBlocksIgnored: !!(result.ok !== true && result.fixedBlocks),
    },
  };
}

module.exports = { reviewAndFix };
