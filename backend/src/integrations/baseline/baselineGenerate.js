// -----------------------------------------------------------------------------
// baseline v5c
// -----------------------------------------------------------------------------
"use strict";

const { detectLanguage, languageHint } = require("../twoPhase/prompts/common");

const BASELINE_RETRY_TEMPS = [0.2, 0.5];
const BASELINE_MAX_TOKENS = 16384;

function isBaselineEnabled() {
  return process.env.HM_BASELINE_ENABLED === "1";
}

function stripStylesForInput(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style>/* CSS preserved by backend */</style>");
}

function stripPersistentDimMasks(baseHtml, log) {
  if (!baseHtml || typeof baseHtml !== "string") return baseHtml;

  const translucentClasses = new Set();
  const classRuleRe = /\.([A-Za-z0-9_-]+)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = classRuleRe.exec(baseHtml)) !== null) {
    const cls = m[1];
    const body = m[2] || "";
    const rgba = /background(?:-color)?\s*:\s*rgba\(([^)]*)\)/i.exec(body);
    if (!rgba) continue;
    const parts = rgba[1].split(",").map((s) => s.trim());
    const alpha = Number(parts[3]);
    if (Number.isFinite(alpha) && alpha > 0 && alpha < 1) {
      translucentClasses.add(cls);
    }
  }

  if (!translucentClasses.size) return baseHtml;

  let removed = 0;
  let out = baseHtml;
  for (const cls of translucentClasses) {
    const re = new RegExp(`<div\\b([^>]*\\bclass=\"[^\"]*\\b${cls}\\b[^\"]*\"[^>]*)>([\\s\\S]*?)<\\/div>`, "gi");
    out = out.replace(re, (full, _attrs, inner) => {
      const innerStr = String(inner || "");
      const plain = innerStr.replace(/<!--([\\s\\S]*?)-->/g, "").replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/gi, "").trim();
      const hasInteractive = /<(input|button|select|textarea|svg|img|canvas)\b/i.test(innerStr);
      if (!plain && !hasInteractive) {
        removed++;
        return "";
      }
      return full;
    });
  }

  if (removed > 0 && log) log(`[baseline-pre] 删除空白半透明遮罩节点 ${removed} 个`);
  return out;
}

function extractHeadFromBase(html) {
  if (!html || typeof html !== "string") return "";
  const m = /<head\b[^>]*>[\s\S]*?<\/head>/i.exec(html);
  return m ? m[0] : "";
}

function extractDoctypeAndHtmlOpen(html) {
  if (!html || typeof html !== "string") {
    return { doctype: "<!DOCTYPE html>", htmlOpen: '<html lang="zh-CN">' };
  }
  const dm = /<!DOCTYPE[^>]*>/i.exec(html);
  const ho = /<html\b[^>]*>/i.exec(html);
  return {
    doctype: dm ? dm[0] : "<!DOCTYPE html>",
    htmlOpen: ho ? ho[0] : '<html lang="zh-CN">',
  };
}

function extractBodyFromRaw(raw) {
  const s = String(raw || "").trim();
  const m1 = /<!--\s*BASELINE_BODY_START\s*-->([\s\S]*?)<!--\s*BASELINE_BODY_END\s*-->/i.exec(s);
  if (m1) {
    const inner = m1[1].trim();
    const bm = /<body\b[\s\S]*<\/body>/i.exec(inner);
    return bm ? bm[0] : inner;
  }
  const m2 = /```(?:html|HTML)?\s*\n?([\s\S]*?)\n?```/i.exec(s);
  if (m2) {
    const inner = m2[1].trim();
    const bm = /<body\b[\s\S]*<\/body>/i.exec(inner);
    if (bm) return bm[0];
    return inner;
  }
  const bm = /<body\b[\s\S]*<\/body>/i.exec(s);
  if (bm) return bm[0];
  return s;
}

function buildBaselinePrompt({ prevHtmlStripped, currentReq, allRequirements, languagePrimary }) {
  const stateById = new Map();
  for (const s of (allRequirements || [])) {
    if (s && typeof s.state_id === "number") stateById.set(s.state_id, s);
  }
  const lastStateId = currentReq && currentReq.last_state;
  const lastStateRec = lastStateId != null ? stateById.get(lastStateId) : null;
  const lastStateName = lastStateRec ? lastStateRec.state_name || `state_${lastStateId}` : null;
  const stateName = (currentReq && currentReq.state_name) || "";
  const curPayload = JSON.stringify(currentReq, null, 2);
  const allPayload = JSON.stringify(allRequirements || [], null, 2);
  const lastDesc =
    "下方 base HTML 是 last_state = " +
    (lastStateId == null ? "null" : lastStateId) +
    (lastStateName ? `（即「${lastStateName}」）` : "") +
    " 的完整 HTML 快照（<style> CSS 已折叠以节省 token）。";

  return [
    "你是资深前端工程师 + UI 设计师。任务：基于 last_state 画面，重写当前 state 的 <body>。",
    "",
    "==================【页面语言】==================",
    languageHint(languagePrimary),
    "",
    "==================【base 的来源】==================",
    lastDesc,
    "base 的 <head>（含 CSS）由后端自动保留并拼接。你只输出 <body>...</body>。",
    "不要输出 <!DOCTYPE>/<html>/<head>/<style>/<link>/<script>。",
    "",
    "==================【输出格式（唯一允许）】==================",
    "<!-- BASELINE_BODY_START -->",
    "<body>",
    "  ...新 body 内容...",
    "</body>",
    "<!-- BASELINE_BODY_END -->",
    "",
    "==================【硬约束】==================",
    "1) 必须保留 base 中状态栏（08:08/信号/电量）和底部 Tab 栏的完整 DOM，不允许简化成圆点或占位块。",
    "2) 三段式：保留 / 删除 / 新增。特别是删除上一态遗留临时层、旧标题、旧卡片流。",
    "3) 全屏新页面必须用主容器：position: fixed; top:44px; bottom:66px; left:0; right:0; z-index:50;",
    "   且主容器必须是不透明背景（#FFF 或 #F3F3F3），防止底层文字透出。",
    "4) 严禁全屏容器使用 top:0 或 height:100%，严禁 z-index>=100 覆盖状态栏/底 Tab。",
    "5) 若本态是浮层/弹窗/选择面板，必须提供遮罩层（rgba(0,0,0,0.35~0.6)）或不透明面板背景，",
    "   不能出现底层文本和前景内容重影透叠。",
    "6) 必须移除上一态主标题文本残影（如'我的工作台'/'营销工作台'/'我的体验项目'等），",
    "   新标题出现后其后方不能再露出旧标题字符。",
    "7) 必须删除顶部装饰背景层（彩色椭圆/渐变圆块/品牌装饰图），状态栏下方背景应为纯色（#F5F5F5 或 #FFFFFF），不得出现粉蓝混色装饰残留。",
    "8) 对 new_test2 类表单页：标题栏请用全宽（100%）顶部栏，而不是 320px 居中小卡片标题。",
    "9) 字体 HarmonyHeiTi, 'HarmonyOS Sans', sans-serif；移动端 360px；关键节点加稳定 id=\"hm-<role>\"。",
    "10) 严禁输出 Tailwind/UnoCSS/原子化 utility class（如 flex/w-full/mx-auto/w-[320px]/text-[14px]/bg-[#fff] 等）。",
    "    页面未引入这些框架，使用会导致样式失效。新增样式必须写在 inline style 或复用 base 现有 Pixso class。",
    "11) 表单控件必须保持视觉稿风格（圆角、间距、边框、字号），禁止退化成浏览器原生默认控件外观。",
    "",
    "==================【临时层 / 持久层注释包裹】==================",
    `弹窗/Toast/浮层/短暂提示 → <!-- 任务节点开始: ${stateName}【临时】 -->...<!-- 任务节点结束: ${stateName}【临时】 -->`,
    `持久新页/表单/详情页/设置页 → <!-- 任务节点开始: ${stateName}【持久】 -->...<!-- 任务节点结束: ${stateName}【持久】 -->`,
    "",
    "==================【全 spec 上下文（按时序）】==================",
    allPayload,
    "",
    "==================【当前 state requirement】==================",
    curPayload,
    "",
    "==================【base HTML（last_state 快照，<style> 已折叠）】==================",
    prevHtmlStripped,
    "",
    "现在按上面的硬约束，只输出 <body>...</body>。",
  ].join("\n");
}

async function callLlmOnce({ llmDeps, prompt, log }) {
  let lastErr = null;
  for (let i = 0; i < BASELINE_RETRY_TEMPS.length; i++) {
    const temp = BASELINE_RETRY_TEMPS[i];
    try {
      const r = await llmDeps.callText("", prompt, { temperature: temp, maxTokens: BASELINE_MAX_TOKENS });
      if (typeof r === "string" && r.trim()) return r;
      log && log(`[baseline] LLM 第 ${i + 1} 次返回空，重试（temp=${temp}）`);
      lastErr = new Error("LLM 返回空");
    } catch (e) {
      lastErr = e;
      log && log(`[baseline] LLM 第 ${i + 1} 次失败：${e.message}`);
    }
  }
  throw lastErr || new Error("baseline: LLM 多次失败");
}

function assembleHtml({ baseHtml, llmBody }) {
  const head = extractHeadFromBase(baseHtml);
  const { doctype, htmlOpen } = extractDoctypeAndHtmlOpen(baseHtml);
  const bodyTrim = (llmBody || "").trim();
  const bodyHtml = /^<body\b/i.test(bodyTrim) ? bodyTrim : `<body>\n${bodyTrim}\n</body>`;
  return [doctype, htmlOpen, head, bodyHtml, "</html>"].join("\n");
}

async function patchOneStateViaBaseline({ prevHtml, currentReq, allRequirements, log, llmDeps }) {
  log = log || function () {};
  if (!llmDeps || typeof llmDeps.callText !== "function") {
    throw new Error("baseline: 缺少 llmDeps.callText");
  }
  if (typeof prevHtml !== "string" || !prevHtml) {
    throw new Error("baseline: prevHtml 不能为空");
  }

  const stateName = ((currentReq && currentReq.state_name) || "").trim();
  const stateId = currentReq && currentReq.state_id;
  log(`[baseline] 启动 state_${stateId} 「${stateName}」`);

  const precleanHtml = stripPersistentDimMasks(prevHtml, log);
  const lang = detectLanguage(precleanHtml);
  const prevHtmlStripped = stripStylesForInput(precleanHtml);

  const prompt = buildBaselinePrompt({
    prevHtmlStripped,
    currentReq,
    allRequirements,
    languagePrimary: lang.primary,
  });

  log(`[baseline] prompt ${(prompt.length / 1024).toFixed(1)}KB lang=${lang.primary} prevHtml=${(precleanHtml.length / 1024).toFixed(1)}KB->stripped ${(prevHtmlStripped.length / 1024).toFixed(1)}KB`);

  const raw = await callLlmOnce({ llmDeps, prompt, log });
  const bodyOnly = extractBodyFromRaw(raw);
  if (!bodyOnly || !/<body\b/i.test(bodyOnly)) {
    throw new Error("baseline: LLM 输出无法提取 <body>");
  }

  const html = assembleHtml({ baseHtml: precleanHtml, llmBody: bodyOnly });
  log(`[baseline] 生成 HTML ${(html.length / 1024).toFixed(1)}KB（其中 LLM body=${(bodyOnly.length / 1024).toFixed(1)}KB）`);

  return {
    html,
    applied: 1,
    skipped: 0,
    raw,
    baseline: {
      promptBytes: prompt.length,
      llmBodyBytes: bodyOnly.length,
      finalHtmlBytes: html.length,
    },
  };
}

module.exports = {
  patchOneStateViaBaseline,
  isBaselineEnabled,
};