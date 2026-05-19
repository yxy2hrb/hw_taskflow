/**
 * ==========================================================
 *  任务流一键生成 · 第二阶段 Skill
 *    A. 语义标注 (annotate)     —— 给 Pixso/Figma 导出的 HTML 加中文锚点注释
 *    B. 持久骨架抽取 (shell)   —— 抽取 <body> 内顶部栏 / 状态栏 / 底部 Tab 等
 *                                并以 data-shell-* 属性标记，便于逐 state 生成时 1:1 复用
 *    C. 逐 state 生成 (state) —— 基于标注 HTML + 骨架 + blueprint.states[i]
 *                                输出完整可渲染 HTML（带【临时】/【持久】注释）
 *
 *  设计参考：HWProject-Specification/taskflow_gen_latest.py 的核心策略，
 *            但简化为"每 state 生成完整 HTML"（而非 OLD/NEW patch），
 *            以便 Node.js 端免去复杂字符串定位、并能直接保存为静态文件渲染。
 * ==========================================================
 */

const { HARMONY_SPEC_PROMPT_BLOCK, HARMONY_FIXED_THEME } = require("./harmonySpec");

/** ------------------------------------------------------------------
 *  A. 语义标注（Annotate）
 *  目标：把长串自动生成的 div / span，通过 AI 在关键节点**前面**插入
 *        <!-- 语义: XXX --> 或 <!-- 区域开始: XXX --> 注释，作为后续锚点。
 *  规则：不修改任何 DOM、不删元素；只允许新增注释。
 * ------------------------------------------------------------------ */

const ANNOTATE_SYSTEM_PROMPT = `
你是资深前端语义标注师。任务：对用户提供的 Pixso/Figma 导出 HTML，**只新增中文注释作为锚点**，
绝不修改/删除任何 DOM 元素、class、id 或文本。

标注原则：
1. 识别并在元素**紧邻前面一行**插入标签型注释，例如：
   <!-- 组件开始: 顶部状态栏 -->  ... <!-- 组件结束: 顶部状态栏 -->
   <!-- 组件开始: 顶部导航栏 -->  ... <!-- 组件结束: 顶部导航栏 -->
   <!-- 组件开始: 内容主区 -->   ... <!-- 组件结束: 内容主区 -->
   <!-- 组件开始: 底部操作栏 -->
   <!-- 组件开始: 卡片组 / Recommendation 卡片 1 -->
2. 若发现卡片列表，给每张卡片都加 "卡片 N" 注释。
3. 若发现按钮、图标组，加 "按钮区: 下载 / 收藏 / 点赞" 等说明。
4. 注释必须概括**语义用途**，不是重复 class 名。
5. 禁止修改任何已存在内容；禁止删除已有注释；禁止增加 div/span/属性。
6. 最终输出必须是完整 HTML（从 <!DOCTYPE html> 到 </html>），用户会直接用它替换原文件。
禁止 Markdown、禁止自然语言解释。
`.trim();

function buildAnnotatePrompt(rawHtml) {
  const MAX = 80000;
  let body = rawHtml;
  if (rawHtml.length > MAX) {
    // 只对 <body> 做标注；其它区域保留原文
    body = rawHtml;  // 仍然全量给，依赖模型自己截断
  }
  return `
请对以下 HTML 做"语义标注"：只在合适位置插入中文注释（<!-- 组件开始: XXX --> … <!-- 组件结束: XXX -->），
不要改动任何现有代码。

====== 原始 HTML ======
${body}
  `.trim();
}

/** ------------------------------------------------------------------
 *  B. 骨架抽取（Shell）
 *  目标：从标注后的 HTML 中，抽取出持久骨架（顶部、底部等）对应的 DOM 片段，
 *        并返回一份"引用清单"（ID + 描述 + 选中策略）。
 *  实现：LLM 输出 JSON，列出需要复用的节点 id / class 与类别归属。
 *        随后服务端根据 blueprint.persistent_shell 勾选情况生成 shellFragments。
 * ------------------------------------------------------------------ */

const SHELL_EXTRACT_SYSTEM_PROMPT = `
你是设计系统骨架分析师。任务：从已做过语义标注的 HTML 中，识别出"跨 state 必须 1:1 保持一致"的持久骨架节点。

输出 JSON，结构：
{
  "status_bar":   { "found": true, "selector": "#frame-6_117641 或 .frame-6_117641", "summary":"时间 08:08 + Wi-Fi + 4G + 100%" },
  "top_app_bar":  { "found": true, "selector": "…", "summary":"标题 Information Details + 返回 + 分享 + 更多" },
  "bottom_tabs":  { "found": false },
  "main_frame":   { "found": true, "selector": ".frame-6_117465", "summary":"手机视口容器 360x780" }
}

要点：
- selector 优先用 id（#id），没有 id 才用 class；必须在原 HTML 中存在；
- summary 用一句话描述该区块；
- 若没找到对应区块，用 { "found": false }；
- 只返回严格 JSON，禁止其它内容。
`.trim();

function buildShellExtractPrompt(annotatedHtml) {
  // 只截一个摘要片段给模型，避免过长
  const sample = annotatedHtml.length > 20000
    ? annotatedHtml.slice(0, 10000) + "\n<!-- … truncated … -->\n" + annotatedHtml.slice(-4000)
    : annotatedHtml;
  return `
请分析以下已标注 HTML，识别出持久骨架并按指定 JSON 返回。

\`\`\`html
${sample}
\`\`\`
  `.trim();
}

/** ------------------------------------------------------------------
 *  C. 逐 state 生成（State HTML）
 *  目标：基于 annotatedHtml（基线） + blueprint.states[i] + 上一 state 的 HTML
 *        输出当前 state 完整 HTML。严格遵循鸿蒙规范 + 规范一致性 +
 *        交互路径成本最低 + 容器/意图匹配。
 * ------------------------------------------------------------------ */

const STATE_GEN_SYSTEM_PROMPT = `
你是鸿蒙规范下的"任务流状态页生成师"。任务：基于一份带语义注释的基线 HTML
（代表【state 0 / 初始静态】），结合当前 state 的意图定义，产出当前 state 的
**完整静态 HTML**（纯静态，不实现真实交互）。

${HARMONY_SPEC_PROMPT_BLOCK}

## 规范一致性（Cross-page Variance 必须趋近于 0）
1. 顶部状态栏（08:08 / Wi-Fi / 4G / 100%）、顶部导航栏（标题 + 返回 + 右侧图标）、
   底部 Tab Bar、全局背景色、主色、字体体系 必须与基线 HTML **1:1** 一致，
   绝不允许修改高度/颜色/图标粗细/字号。
2. 新增 UI（弹窗、面板、浮层、进度条等）必须使用【临时】注释包裹：
   <!-- 任务节点开始: <state_name>【临时】 -->
   …（只属于本 state 的新增 UI）
   <!-- 任务节点结束: <state_name>【临时】 -->
3. 若 state 引入后续 state 也会保留的元素（如"已下载徽章"），使用【持久】注释：
   <!-- 任务节点开始: <state_name>【持久】 -->
4. 上一 state 的【临时】块若在本 state 仍存在，必须加 style="display:none;" 隐藏；不要直接删除。
5. 所有样式**仅使用 inline style**，禁止复用原始 class 做"状态变化"（如高亮、置灰）。

## 意图×容器匹配（Pattern Compliance）
当前 state 的 container 已指定，必须用以下规则落地：
- Inline       : 在页面原位 inline 修改（例如把下载按钮状态改为"已下载"），不要弹窗；
- Toast        : body 末尾加一条固定在顶部/底部的半透明条形提示，3~5 秒样式，z-index ≥ 9999；
- Popover      : 在目标按钮的父容器里（position: relative）做 position:absolute 的小浮层；
- BottomSheet  : 底部半模态，固定 bottom:0; width:100%; border-radius:16px 16px 0 0; 
- Dialog       : 全屏遮罩 + 中心 card（最大宽 280px / 移动端、480px / 桌面端）；遮罩 rgba(0,0,0,0.45)；
- NewPage      : 整页覆盖，但必须保留"相同的"顶部状态栏 + 返回按钮；背景色与基线一致。

## 弹窗约束（硬约束）
- 所有弹窗必须作为 <body> 的最后一个直接子元素，插在 <script> 之前；
- 根节点必须 position: fixed; inset: 0; z-index: 9999+；
- **严禁 top > 200px 的绝对坐标**（如 top: 1020px 一律改写为 top: 0; inset: 0）；
- 移动端弹窗不得超出 360px 宽，桌面端不得超出 1920px 宽；
- 若基线为移动端，弹窗字号必须用移动端字号体系（≤16px）。

## 交互路径成本（Cost 最低原则）
根据 actions 数组按权重表评估，如果存在更低 Cost 的替代方案，请在 <!-- 设计说明 --> 注释里指出。

## 输出格式
直接输出**完整 HTML 字符串**（从 <!DOCTYPE html> 开头，到 </html> 结尾）。
禁止 Markdown、禁止 <think>、禁止解释。
`.trim();

/**
 * @param {object} args
 * @param {string} args.baselineHtml - 带语义注释的基线 HTML（state 0）
 * @param {object} args.blueprint    - 完整蓝图
 * @param {object} args.state        - 当前要生成的 state 定义
 * @param {string=} args.prevStateHtml - 上一个 state 的 HTML（可省）
 */
function buildStatePagePrompt({ baselineHtml, blueprint, state, prevStateHtml }) {
  const baselineTrim = baselineHtml.length > 60000
    ? baselineHtml.slice(0, 40000) + "\n<!-- ... baseline truncated ... -->\n" + baselineHtml.slice(-12000)
    : baselineHtml;

  const prevBlock = prevStateHtml
    ? `\n\n==== 上一 state（${state.last_state}）的 HTML，供你参考以维持一致性 ====\n${prevStateHtml.slice(0, 20000)}`
    : "";

  return `
## 任务流蓝图（meta）
${JSON.stringify(blueprint.meta, null, 2)}

## 持久骨架清单（必须 1:1 保留）
${JSON.stringify(blueprint.persistent_shell, null, 2)}

## 当前要生成的 state
${JSON.stringify(state, null, 2)}

## 所有 state 概览（链路一致性参考）
${JSON.stringify(blueprint.states.map(s => ({ id: s.id, name: s.name, intent: s.intent, container: s.container, last_state: s.last_state })), null, 2)}

## 基线 HTML（代表初始静态）
\`\`\`html
${baselineTrim}
\`\`\`
${prevBlock}

请输出【当前 state 的完整 HTML】，满足以上所有硬约束。`.trim();
}

/** ------------------------------------------------------------------
 *  裁剪基线 HTML：Pixso/Figma 导出件里，<style> 块会包含几百条
 *  .frame-xxx / .vector-xxx / .text-xxx 等自动生成 class；这些对
 *  LLM 生成"使用 inline style 的新版 state"没有价值，却占掉了大量
 *  token（实测 76KB 中约 60% 是 class 定义）。
 *  这里把 <style> 替换成一个精简版（只留 body/html/* 基础 reset），
 *  同时把 <body> 中保留下来的 class 属性全部保留（供 LLM 了解语义），
 *  但模型输出时**不会再去依赖这些 class**（已在 system prompt 里强制 inline style）。
 * ------------------------------------------------------------------ */
function compactifyBaselineHtml(html) {
  if (!html) return html;
  const STYLE_RE = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  const SIMPLIFIED_STYLE = `<style>
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; background-color: #F3F3F3; font-family: "HarmonyOS Sans SC", "PingFang SC", system-ui, sans-serif; }
span { word-break: break-word; }
/* 原 Pixso 自动生成的 class 已被裁剪，使用 inline style 生成 state */
</style>`;
  const compact = html.replace(STYLE_RE, SIMPLIFIED_STYLE);
  return compact;
}

/** 小工具：给 HTML 做轻量后处理（安全 fallback）。 */
function postProcessGeneratedHtml(raw) {
  if (!raw) return "";
  let html = String(raw).trim();

  // 去掉 ```html ... ``` 包裹
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // 去掉 <think>...</think>
  html = html.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 若模型漏了 DOCTYPE，补上
  if (!/<!DOCTYPE/i.test(html) && /<html/i.test(html)) {
    html = "<!DOCTYPE html>\n" + html;
  }

  // 安全：移除 top>200px 的弹窗定位
  html = html.replace(/top:\s*([2-9]\d{2,}|[1-9]\d{3,})px/gi, "top: 0");

  return html;
}

module.exports = {
  // A
  ANNOTATE_SYSTEM_PROMPT,
  buildAnnotatePrompt,
  // B
  SHELL_EXTRACT_SYSTEM_PROMPT,
  buildShellExtractPrompt,
  // C
  STATE_GEN_SYSTEM_PROMPT,
  buildStatePagePrompt,
  // utils
  compactifyBaselineHtml,
  postProcessGeneratedHtml,
  HARMONY_FIXED_THEME,
};
