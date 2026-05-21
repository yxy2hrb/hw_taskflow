/**
 * ==========================================================
 *  任务流一键生成 · 路由模块
 *
 *  Endpoints
 *    POST /api/oneclick/start                —— 创建会话，返回 Phase 1 问题
 *    POST /api/oneclick/answer               —— 答一轮，拿下一轮问题或最终蓝图
 *    GET  /api/oneclick/session/:id          —— 查询当前会话
 *    POST /api/oneclick/blueprint            —— 手动覆盖蓝图
 *    POST /api/oneclick/generate             —— （兼容旧）一次性生成，事件数组回放
 *    GET  /api/oneclick/generate/stream      —— SSE 流式生成，每个 state 完成即推送
 *    GET  /api/oneclick/list                 —— 列出本地保存的任务流
 *    GET  /api/oneclick/result/:dir          —— 读取 manifest
 *    GET  /api/oneclick/serve/:sid/:file     —— 按文件名从"源 HTML 所在目录"读取
 * ==========================================================
 */

const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const {
  TASKFLOW_INTENT_SYSTEM_PROMPT,
  buildPhasePrompt,
} = require("./prompts/taskflowIntentSkill");

const {
  parseBlocks,
  applyReplacementsInMemory,
  hideAllTempUi,
  fixDisplayConflicts,
  stripCodeFences,
  enforceOverlayTopLimit,
  enforceOverlayZIndex,
  buildPatchPrompt,
  detectLanguage,
} = require("./taskflowPatch");

const { expandHmTags, injectIconFontIfNeeded } = require("./integrations/hmComponentExpander");
const assetCache = require("./integrations/pixsoAssetCache");
const { reviewAndFix } = require("./patchReview");
const {
  validateBlueprint,
  validateStateHtml,
  writeFinalScreenshot,
} = require("./taskflowQuality");

// HM 组件 DSL 路径（feature flag 控制，**默认开启**；设置 HM_DSL_ENABLED=0 可关掉）
const HM_DSL_ENABLED = process.env.HM_DSL_ENABLED !== "0";

// Legacy [OLD]/[NEW] 路径的 11 步后处理（feature flag 控制，**默认开启**；
// 设置 HM_LEGACY_POSTPROC_ENABLED=0 可全部跳过，用于评估基线 LLM 直出能力）
const LEGACY_POSTPROC_ENABLED = process.env.HM_LEGACY_POSTPROC_ENABLED !== "0";
const { shouldUseDsl: hmShouldUseDsl } = require("./integrations/hmDsl/skill");
const { patchOneStateViaDsl: hmPatchViaDsl } = require("./integrations/hmDsl/patchViaDsl");

// twoPhase 路径（feature flag，默认关闭）：skill1 规划 → 并行 skill2 执行 → 字符串合并
// 启用：HM_TWOPHASE_ENABLED=1。此路径完全独立，不调 DSL，不跑 11 步后处理。
const { patchOneStateViaTwoPhase: hmPatchViaTwoPhase, isTwoPhaseEnabled } =
  require("./integrations/twoPhase");

// baseline 路径（feature flag，默认关闭）：一锤子全页 HTML 重写，跳过 skill1/skill2/patcher。
// 启用：HM_BASELINE_ENABLED=1。优先级最高，命中即短路。用作 twoPhase 对照组。
const { patchOneStateViaBaseline: hmPatchViaBaseline, isBaselineEnabled } =
  require("./integrations/baseline/baselineGenerate");

// twoPhase 严格模式（**默认开启**）：twoPhase 失败时**直接抛错**，不让 DSL / legacy 兜底接管。
// 目的：暴露 twoPhase 自身的真实失败，避免 DSL 路径悄悄"救场"掩盖问题
// （v37 前的现象：很多 state 看似 twoPhase 修好了，其实是 DSL 接管的）。
// 关闭：HM_TWOPHASE_STRICT=0 → 恢复旧的级联兜底行为
const TWOPHASE_STRICT = process.env.HM_TWOPHASE_STRICT !== "0";

const BLUEPRINT_INTENT_PASS_SCORE = Number(process.env.BLUEPRINT_INTENT_PASS_SCORE || 75);
const BLUEPRINT_INTENT_REPAIR_ACCEPT_SCORE = Number(process.env.BLUEPRINT_INTENT_REPAIR_ACCEPT_SCORE || 65);

// antdOneShot 路径（feature flag，默认关闭）：跳过 per-state 循环，
// 改用单次 LLM 调用产出 happy path 上所有 state 的 OLD/NEW + antd-mobile JSX islands，
// 最终打包成单个可交互 HTML（CDN 注入 React/antd-mobile/Babel standalone）。
// 启用：HM_ANTD_ENABLED=1。优先级高于 twoPhase/DSL/legacy 的所有 per-state 路径。
const { isAntdOneShotEnabled, runAntdOneShotPipeline } = require("./integrations/antdOneShot");

// ─────────────────────────────────────────────────────────────
//  Session state
// ─────────────────────────────────────────────────────────────
const sessions = new Map();
const SAVE_ROOT = path.resolve(__dirname, "../../saved-taskflow");

function newSessionId() { return "tf_" + crypto.randomBytes(6).toString("hex"); }

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

function timestampTag() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ─────────────────────────────────────────────────────────────
//  LLM wrapper
// ─────────────────────────────────────────────────────────────
let llmDeps = null;
function bindLLM(deps) { llmDeps = deps; }

async function callPhase(phase, seed, qaHistory) {
  const userPrompt = buildPhasePrompt(phase, {
    seedHtml: seed.html,
    seedImageHint: seed.imageName || (seed.hasImage ? "已上传参考图" : "无"),
    seedBrief: seed.brief,
    qaHistory,
  });
  // qwen 偶发空返回（大 base HTML / 图片输入时尤其频繁）。给 callJSON 加 2 次重试，
  // 第二次拉高 temperature 制造扰动，避免重复同一空响应。
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const temperature = attempt === 1 ? 0.6 : 0.85;
    try {
      const r = await llmDeps.callJSON(TASKFLOW_INTENT_SYSTEM_PROMPT, userPrompt, { temperature });
      if (r && typeof r === "object") return normalizePhaseResponse(r, phase);
      console.warn(`[phase ${phase}] 第 ${attempt} 次返回空（type=${typeof r}），${attempt < 2 ? "重试…" : "放弃"}`);
    } catch (e) {
      lastErr = e;
      console.warn(`[phase ${phase}] 第 ${attempt} 次异常：${e.message || e}，${attempt < 2 ? "重试…" : "放弃"}`);
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

async function repairBlueprintOnce({ phase, seed, qaHistory, blueprint, issues }) {
  if (!llmDeps?.callJSON) return null;
  const basePrompt = buildPhasePrompt(phase, {
    seedHtml: seed.html,
    seedImageHint: seed.imageName || (seed.hasImage ? "已上传参考图" : "无"),
    seedBrief: seed.brief,
    qaHistory,
  });
  const repairPrompt = `${basePrompt}

==================【蓝图校验失败，必须重生成】==================
上一次输出的 blueprint 未通过后端硬校验，禁止解释，禁止只修局部片段。请重新输出完整 JSON：
{
  "action": "done",
  "blueprint": { "meta": {...}, "states": [...] }
}

硬性要求：
- states 至少 2 个；
- state_1 必须是 state_id=1，last_state 为 null 或缺省；
- 非 state_1 的 last_state 必须是此前已经出现的 state_id，禁止 null / 缺省；
- implementation_method 必须包含"基于 last_state + 保留/删除/新增"三段式。

校验错误：
${issues.map((it, i) => `${i + 1}. ${it}`).join("\n")}

上一次无效 blueprint：
${JSON.stringify(blueprint, null, 2)}
`;
  const raw = await llmDeps.callJSON(TASKFLOW_INTENT_SYSTEM_PROMPT, repairPrompt, { temperature: 0.4 });
  return normalizePhaseResponse(raw, phase);
}

function normalizeIntentReview(raw, fallback = {}) {
  const safe = raw && typeof raw === "object" ? raw : {};
  const scoreNum = Number(safe.score);
  const score = Number.isFinite(scoreNum)
    ? Math.max(0, Math.min(100, Math.round(scoreNum)))
    : (Number.isFinite(fallback.score) ? fallback.score : 75);
  const majorIssues = Array.isArray(safe.majorIssues) ? safe.majorIssues.map(String).filter(Boolean) : (fallback.majorIssues || []);
  const minorIssues = Array.isArray(safe.minorIssues) ? safe.minorIssues.map(String).filter(Boolean) : (fallback.minorIssues || []);
  const coverage = safe.coverage && typeof safe.coverage === "object" ? safe.coverage : (fallback.coverage || {});
  const decision = score >= BLUEPRINT_INTENT_PASS_SCORE ? "pass" : "repair_once";
  return {
    ok: score >= BLUEPRINT_INTENT_PASS_SCORE,
    score,
    decision,
    majorIssues,
    minorIssues,
    coverage,
    source: safe.source || fallback.source || "unknown",
  };
}

function heuristicBlueprintIntentReview({ seed, blueprint }) {
  const brief = String(seed?.brief || "");
  const bpText = JSON.stringify(blueprint || {});
  const lang = detectLanguage(seed?.html || "");
  let score = 100;
  const majorIssues = [];
  const minorIssues = [];
  const coverage = {
    coreAction: true,
    targetState: true,
    interactionPattern: true,
    language: true,
    stateChain: true,
    noContradiction: true,
  };

  if (/(确认|confirm|submit|apply|刷新|refresh|结果|result)/i.test(brief) && !/(确认|confirm|submit|apply|刷新|refresh|结果|result)/i.test(bpText)) {
    score -= 25;
    coverage.targetState = false;
    majorIssues.push("brief 提到确认/应用/刷新/结果态，但 blueprint 没有明显覆盖该关键结果。");
  }
  if (/(底部抽屉|底部弹窗|bottom\s*sheet)/i.test(brief) && !/(底部|贴底|bottom\s*sheet|align-items\s*:\s*flex-end)/i.test(bpText)) {
    score -= 30;
    coverage.interactionPattern = false;
    majorIssues.push("brief 要求底部抽屉/底部弹窗，但 blueprint 未体现贴底或 bottom sheet 形态。");
  }
  if (/(无遮罩|无弹窗|no\s+overlay|without\s+overlay|no\s+modal)/i.test(brief) && /(遮罩|modal|rgba\(0,0,0|rgba\(25,25,25)/i.test(bpText)) {
    score -= 30;
    coverage.noContradiction = false;
    majorIssues.push("brief 明确要求无遮罩/无弹窗，但 blueprint 规划了遮罩或 modal。");
  }
  if (lang.primary === "en") {
    const cnUiTerms = bpText.match(/(最新到最早|降序|升序|取消|确认|筛选|弹窗|遮罩|底部抽屉)/g) || [];
    if (cnUiTerms.length >= 2) {
      score -= Math.min(20, 8 + cnUiTerms.length * 2);
      coverage.language = false;
      minorIssues.push(`原页面主语言为英文，但 blueprint 中含中文 UI 文案/控件词：${Array.from(new Set(cnUiTerms)).slice(0, 8).join("、")}。`);
    }
  }
  const states = Array.isArray(blueprint?.states) ? blueprint.states : [];
  if (states.length <= 2 && /(确认|confirm|submit|apply|刷新|refresh|结果|result)/i.test(brief) && /(弹出|展开|open|show|panel|dialog|sheet)/i.test(brief)) {
    score -= 12;
    minorIssues.push("brief 同时包含展开与确认/结果语义，但 blueprint 只有 2 个 state，可能缺少确认后的结果态。");
  }
  return normalizeIntentReview({ score, majorIssues, minorIssues, coverage, source: "heuristic" });
}

async function reviewBlueprintIntent({ seed, blueprint }) {
  const fallback = heuristicBlueprintIntentReview({ seed, blueprint });
  if (!llmDeps?.callJSON) return fallback;

  const lang = detectLanguage(seed?.html || "");
  const prompt = `你是任务流 blueprint 的意图一致性评审员。你不是视觉走查员，不检查字号、圆角、阴影、间距等细节。

请对 blueprint 是否覆盖用户 brief 的核心交互意图打 0-100 分。不要吹毛求疵：主路径完整、交互形态一致时，即使有小文案或样式瑕疵，也应给 75 分以上。

评分只关注：
1. coreAction：是否覆盖用户的核心动作；
2. targetState：是否覆盖关键结果态；
3. interactionPattern：弹窗/底部抽屉/全屏页/无遮罩等交互形态是否匹配；
4. language：页面主语言与新增 UI 文案是否明显冲突；
5. stateChain：状态依赖链是否语义合理；
6. noContradiction：是否与 brief 明确要求冲突。

输出严格 JSON：
{
  "score": 0-100,
  "majorIssues": ["只写会导致方向错误或关键状态缺失的问题"],
  "minorIssues": ["只写非阻断的小风险"],
  "coverage": {
    "coreAction": true,
    "targetState": true,
    "interactionPattern": true,
    "language": true,
    "stateChain": true,
    "noContradiction": true
  }
}

页面主语言检测：${lang.primary}（中文字符 ${lang.cn}, 英文词块 ${lang.en}）

【用户 brief】
${seed?.brief || ""}

【blueprint】
${JSON.stringify(blueprint, null, 2)}
`;
  try {
    const raw = await llmDeps.callJSON("", prompt, { temperature: 0.2 });
    const reviewed = normalizeIntentReview({ ...raw, source: "llm" }, fallback);
    // LLM 分数异常偏低但没有 major issue 时，按启发式结果兜住，避免过严卡交付。
    if (reviewed.score < BLUEPRINT_INTENT_PASS_SCORE && reviewed.majorIssues.length === 0 && fallback.score >= BLUEPRINT_INTENT_PASS_SCORE) {
      return { ...fallback, source: "heuristic_guarded", minorIssues: [...fallback.minorIssues, ...reviewed.minorIssues] };
    }
    return reviewed;
  } catch (e) {
    return { ...fallback, source: "heuristic_fallback", minorIssues: [...fallback.minorIssues, `LLM intent review failed: ${e.message}`] };
  }
}

async function repairBlueprintIntentOnce({ phase, seed, qaHistory, blueprint, intentReview }) {
  if (!llmDeps?.callJSON) return null;
  const basePrompt = buildPhasePrompt(phase, {
    seedHtml: seed.html,
    seedImageHint: seed.imageName || (seed.hasImage ? "已上传参考图" : "无"),
    seedBrief: seed.brief,
    qaHistory,
  });
  const repairPrompt = `${basePrompt}

==================【blueprint 意图一致性分数偏低，修复一次】==================
上一次 blueprint 的意图一致性评分为 ${intentReview.score}/100，低于通过阈值 ${BLUEPRINT_INTENT_PASS_SCORE}。
请重新输出完整 JSON：{ "action": "done", "blueprint": { "meta": {...}, "states": [...] } }

只修正会导致方向错误或关键状态缺失的问题；不要因为字号、圆角、阴影、间距等细节重写整个方案。
如果原页面主语言为英文，新增 UI 文案应使用英文。

主要问题：
${(intentReview.majorIssues || []).map((it, i) => `${i + 1}. ${it}`).join("\n") || "无"}

次要风险：
${(intentReview.minorIssues || []).map((it, i) => `${i + 1}. ${it}`).join("\n") || "无"}

上一次 blueprint：
${JSON.stringify(blueprint, null, 2)}
`;
  const raw = await llmDeps.callJSON(TASKFLOW_INTENT_SYSTEM_PROMPT, repairPrompt, { temperature: 0.45 });
  return normalizePhaseResponse(raw, phase);
}

async function acceptGeneratedBlueprint({ session, raw, phase }) {
  if (!raw || raw.action !== "done" || !raw.blueprint) {
    const err = new Error("生成蓝图失败");
    err.raw = raw;
    throw err;
  }

  let blueprint = raw.blueprint;
  let validation = validateBlueprint(blueprint);
  let repaired = false;
  if (!validation.ok) {
    const retry = await repairBlueprintOnce({
      phase,
      seed: session.seed,
      qaHistory: session.qaHistory,
      blueprint,
      issues: validation.issues,
    });
    if (retry?.action === "done" && retry.blueprint) {
      blueprint = retry.blueprint;
      validation = validateBlueprint(blueprint);
      repaired = true;
    }
  }

  if (!validation.ok) {
    const err = new Error(`blueprint invalid: ${validation.issues.join("; ")}`);
    err.validation = validation;
    throw err;
  }

  let intentReview = await reviewBlueprintIntent({ seed: session.seed, blueprint });
  let intentRepaired = false;
  if (intentReview.score < BLUEPRINT_INTENT_PASS_SCORE) {
    const retry = await repairBlueprintIntentOnce({
      phase,
      seed: session.seed,
      qaHistory: session.qaHistory,
      blueprint,
      intentReview,
    });
    if (retry?.action === "done" && retry.blueprint) {
      const retryValidation = validateBlueprint(retry.blueprint);
      if (retryValidation.ok) {
        const retryIntentReview = await reviewBlueprintIntent({ seed: session.seed, blueprint: retry.blueprint });
        if (retryIntentReview.score >= BLUEPRINT_INTENT_REPAIR_ACCEPT_SCORE || retryIntentReview.score >= intentReview.score) {
          blueprint = retry.blueprint;
          validation = retryValidation;
          intentReview = retryIntentReview;
          intentRepaired = true;
        }
      }
    }
  }
  intentReview = {
    ...intentReview,
    ok: intentReview.score >= BLUEPRINT_INTENT_PASS_SCORE,
    repaired: intentRepaired,
    continuedWithRisk: intentReview.score < BLUEPRINT_INTENT_PASS_SCORE,
    passScore: BLUEPRINT_INTENT_PASS_SCORE,
    repairAcceptScore: BLUEPRINT_INTENT_REPAIR_ACCEPT_SCORE,
    decision: intentReview.score >= BLUEPRINT_INTENT_PASS_SCORE ? "pass" : "continue_with_risk",
  };

  session.blueprint = blueprint;
  session.blueprintIntentReview = intentReview;
  const saved = await persistTaskflowJson(session);
  return { blueprint, validation, repaired, intentReview, saved };
}

/**
 * 把 LLM 偶尔"少包一层"的输出归一化。
 *   - phase 4 期望: { action: "done", blueprint: { meta, states } }
 *     兼容: 直接 { meta, states }（部分模型可能这样输出）
 *   - phase 1-3 期望: { action: "ask", questionText, options, ... }
 *     若已经是这种 shape 就原样返回
 */
function normalizePhaseResponse(raw, phase) {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.action === "done" && raw.blueprint) return raw;
  if (raw.action === "ask") return raw;
  // 兜底：检测 blueprint shape（有 meta 和 states 数组）
  if (raw.meta && Array.isArray(raw.states)) {
    console.warn(`[phase ${phase}] LLM 直接输出 blueprint shape，自动包成 {action:"done", blueprint:...}`);
    return { action: "done", blueprint: { meta: raw.meta, states: raw.states } };
  }
  // 兜底：检测 ask shape（有 questionText / options）
  if (raw.questionText || Array.isArray(raw.options)) {
    console.warn(`[phase ${phase}] LLM 直接输出 ask shape，自动加 action:"ask"`);
    return { action: "ask", ...raw };
  }
  return raw;
}

function shapeQuestion(rawAsk, phase) {
  const options = Array.isArray(rawAsk?.options) ? rawAsk.options.map((o, i) => ({
    id: String(o.id || `opt_${i + 1}`),
    label: String(o.label || o.text || `选项${i + 1}`),
    rationale: String(o.rationale || o.reason || ""),
    group: o.group ? String(o.group) : "",
    // Phase 2 是“要生成哪些 state 页面”，产品语义上默认应保留全部候选；
    // 避免 LLM 漏打 default 导致前端/脚本只选第一个 state。
    default: phase === 2 ? true : o.default === true,
  })) : [];
  return {
    id: `phase_${phase}`,
    phase,
    questionText: rawAsk?.questionText || rawAsk?.text || "请选择：",
    options,
    multiSelect: rawAsk?.multiSelect !== false,
    allowCustom: rawAsk?.allowCustom !== false,
    note: rawAsk?.note || "",
    sectionLabel: `任务流阶段 ${phase}/3`,
    sectionProgress: { current: phase, total: 3 },
  };
}

// ─────────────────────────────────────────────────────────────
//  把 blueprint 转成 taskflow.json（扁平数组格式）
// ─────────────────────────────────────────────────────────────
function blueprintToTaskflowArray(blueprint) {
  const states = (blueprint?.states || []).slice().sort((a, b) => a.state_id - b.state_id);
  return states.map(s => {
    const entry = {
      state_id: s.state_id,
      state_name: s.state_name,
      description: s.description,
      implementation_method: s.implementation_method,
    };
    // 对齐参考样例：state_1 不写 last_state 字段；其它写真实前序 id。
    // 不再把缺失 last_state 静默兜底成 1，非法蓝图必须在生成前失败。
    if (s.state_id !== 1) entry.last_state = s.last_state;
    return entry;
  });
}

/**
 * 一旦蓝图确定（Phase 1 三轮对话结束，或手动 /blueprint 覆盖）就落盘。
 * 输出目录（outDir）一次性确定并保存到 session.generation，供后续增量打补丁复用。
 */
async function persistTaskflowJson(session) {
  const { blueprint, seed } = session;
  if (!blueprint) return null;
  const validation = validateBlueprint(blueprint);
  if (!validation.ok) {
    const err = new Error(`blueprint invalid: ${validation.issues.join("; ")}`);
    err.validation = validation;
    throw err;
  }

  let outDir, savedInSource = false, sourceDir = null;
  if (session.generation?.outDir) {
    outDir = session.generation.outDir;
    savedInSource = !!session.generation.savedInSource;
    sourceDir = session.generation.sourceDir;
  } else {
    const slug = (blueprint.meta?.slug || "taskflow").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const ts = timestampTag();
    if (seed.sourceDir) {
      outDir = path.join(seed.sourceDir, `_taskflow_${ts}`);
      savedInSource = true;
      sourceDir = seed.sourceDir;
    } else {
      outDir = path.join(SAVE_ROOT, `${ts}_${slug}`);
    }
    await ensureDir(outDir);
    session.generation = {
      slug,
      outDir,
      savedInSource,
      sourceDir,
      dirName: path.basename(outDir),
      manifest: null,
    };
  }

  const arr = blueprintToTaskflowArray(blueprint);
  await fs.writeFile(path.join(outDir, "taskflow.json"), JSON.stringify(arr, null, 2), "utf-8");
  await fs.writeFile(path.join(outDir, "blueprint.json"), JSON.stringify(blueprint, null, 2), "utf-8");

  return { outDir, savedInSource, dirName: path.basename(outDir), taskflowPath: path.join(outDir, "taskflow.json") };
}

// ─────────────────────────────────────────────────────────────
//  Patch-based generation pipeline (ported from taskflow_gen_latest.py)
// ─────────────────────────────────────────────────────────────
function sanitizeBaseline(html) {
  // 处理 display 冲突、隐藏历史临时 UI（第一次没有历史，no-op 也安全）
  return fixDisplayConflicts(hideAllTempUi(html));
}

/**
 * 兜底：扫描所有【临时】块，如果某个块在 prevHtml 中存在（说明它原本是上一态的临时块），
 * 但 patched 中该块的 inner 与 prevHtml 中的**显著不同**（说明 LLM 把它当作"基底"改造来表达
 * 当前 state 的子状态变化），就把它的块名改为当前 state name，避免被 hideAllTempUi 当作
 * "上一态残留"自动 display:none。
 *
 * 例：上一态是"全屏姓名编辑页【临时】"，当前 state 是"编辑页提交中状态"，LLM [NEW] 中给保存按钮
 *     加了 spinner 还在原"全屏姓名编辑页【临时】"块里 —— 自动改名为"编辑页提交中状态【临时】"。
 */
/**
 * 兜底：扫描所有"裸露的"全屏 / 弹窗类浮层（顶层 div 带 \`position:fixed\` 且
 * 满足全屏 inset:0 或弹窗居中布局），如果它们**不在**任何 \`<!-- 任务节点开始: …【临时】 -->\`
 * 注释包裹内，且**也不在 prevHtml 中**（说明是当前 patch 新增的），就自动用
 * \`<当前 state_name>【临时】\` 注释把它包起来，避免下一态无法隐藏导致鬼影叠加。
 *
 * 仅处理"位于 body 顶层、具有 position:fixed 全屏特征"的 div，避免误伤组件内部 fixed 元素。
 */
function wrapNakedOverlays(html, prevHtml, currentTaskName, log) {
  if (!currentTaskName) return html;

  // 1) 抽出当前 HTML 里所有【临时】块的字符范围，用来判断某个 div 是否已经被注释包住
  const tempRanges = [];
  const tempRe = /<!--\s*任务节点开始:\s*(.+?)【(?:临时|持久)】\s*-->[\s\S]*?<!--\s*任务节点结束:\s*\1【(?:临时|持久)】\s*-->/g;
  let m;
  while ((m = tempRe.exec(html)) !== null) {
    tempRanges.push([m.index, m.index + m[0].length]);
  }
  const insideTemp = (idx) => tempRanges.some(([s, e]) => idx >= s && idx < e);

  // 2) 抽出 prevHtml 中所有 fixed 浮层"指纹"，避免把已存在的浮层误判为新增
  const prevFingerprints = new Set();
  if (prevHtml) {
    const re = /<div\b[^>]*\bstyle\s*=\s*"([^"]*?position\s*:\s*fixed[^"]*?)"[^>]*>/gi;
    let pm;
    while ((pm = re.exec(prevHtml)) !== null) {
      prevFingerprints.add(pm[0].slice(0, 200));
    }
  }

  // 3) 扫描候选浮层：position:fixed + 全屏特征（inset:0 / 充满 100%）
  //    只取顶层 div（开始位置不在另一个 div 内部）—— 用最简单的 "<div ...style=\"...position:fixed...\">" 启发式即可
  const candidateRe = /<div\b[^>]*\bstyle\s*=\s*"([^"]*?position\s*:\s*fixed[^"]*?)"[^>]*>/gi;
  const candidates = [];
  let cm;
  while ((cm = candidateRe.exec(html)) !== null) {
    const idx = cm.index;
    if (insideTemp(idx)) continue;
    const style = cm[1];
    const isOverlayLike =
      /\binset\s*:\s*0\b/i.test(style) ||
      (/\btop\s*:\s*0\b/i.test(style) && /\bleft\s*:\s*0\b/i.test(style)) ||
      (/\bbottom\s*:\s*0\b/i.test(style) && /\bleft\s*:\s*0\b/i.test(style)) ||
      /\bz-index\s*:\s*\d{3,}/i.test(style);
    if (!isOverlayLike) continue;
    if (prevFingerprints.has(cm[0].slice(0, 200))) continue;

    // 找到匹配的闭合 </div>
    const close = findMatchingDivClose(html, idx);
    if (close === -1) continue;
    candidates.push({ start: idx, end: close + "</div>".length });
  }

  if (!candidates.length) return html;

  // 4) 从后往前包，避免 idx 错位
  candidates.sort((a, b) => b.start - a.start);
  let out = html;
  for (const c of candidates) {
    const before = out.slice(0, c.start);
    const segment = out.slice(c.start, c.end);
    const after = out.slice(c.end);
    out = `${before}<!-- 任务节点开始: ${currentTaskName}【临时】 -->\n${segment}\n<!-- 任务节点结束: ${currentTaskName}【临时】 -->${after}`;
  }
  log && log(`[wrap] 自动包裹 ${candidates.length} 个裸露浮层为 '${currentTaskName}【临时】'`);
  return out;
}

/** 从 startIdx 处的 <div ...> 起，扫描配对的 </div>，返回匹配 </div> 的开始下标；找不到返回 -1。 */
function findMatchingDivClose(html, startIdx) {
  const openTag = /<div\b[^>]*>/gi;
  const closeTag = /<\/div\s*>/gi;
  // 跳过自身的 <div ...> 开头
  openTag.lastIndex = startIdx;
  const firstOpen = openTag.exec(html);
  if (!firstOpen || firstOpen.index !== startIdx) return -1;
  let depth = 1;
  let cursor = openTag.lastIndex;
  while (cursor < html.length) {
    openTag.lastIndex = cursor;
    closeTag.lastIndex = cursor;
    const nextOpen = openTag.exec(html);
    const nextClose = closeTag.exec(html);
    if (!nextClose) return -1;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      cursor = openTag.lastIndex;
    } else {
      depth--;
      if (depth === 0) return nextClose.index;
      cursor = closeTag.lastIndex;
    }
  }
  return -1;
}

/**
 * 沿 last_state 链收集"祖先 state name"——它们的【临时】UI 在当前 state 视觉上应作为基底保留。
 * 比如 编辑权限【临时】→ 日期选择弹窗【临时】 → 后者 last_state=前者，前者要保留可见。
 * 防御性：循环引用 / 找不到时直接返回已收集的部分；最多回溯 8 层。
 */
function collectAncestorNames(currentReq, allRequirements) {
  if (!currentReq || !Array.isArray(allRequirements)) return [];
  const byId = new Map(allRequirements.map(r => [r.state_id, r]));
  const out = [];
  const seen = new Set();
  let cur = currentReq;
  for (let depth = 0; depth < 8; depth++) {
    if (!cur || cur.last_state == null) break;
    if (seen.has(cur.last_state)) break;
    seen.add(cur.last_state);
    const parent = byId.get(cur.last_state);
    if (!parent) break;
    if (parent.state_name) out.push(String(parent.state_name).trim());
    cur = parent;
  }
  return out;
}

/**
 * 自动给"覆盖式失败/异常/加载失败"类的 fixed 全屏遮罩补上不透明白底，
 * 以盖住背后 D2C 自带的多份相同 frame（D2C 把多 artboard 展开导致背景层透出）。
 *
 * 判断条件（同时满足才动）：
 *  1) state_name + description 含"失败 / 异常 / 加载失败 / 网络错误 / error"等错误反馈语义；
 *  2) 该状态描述**不是 Dialog/确认对话框**（即不含"弹窗/对话框/Dialog/确认/取消按钮"等弹窗特征）；
 *  3) 当前【临时】块根节点是 \`position:fixed; inset:0\` 且 background 是半透或未指定。
 *
 * 处理：把根 div 的 background 改成不透明白底（rgba(255,255,255,1)），并保留 z-index。
 */
function enforceOpaqueErrorOverlay(html, currentReq, log) {
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`.toLowerCase();
  const isErrorState = /(失败|异常|出错|加载错误|网络错误|加载不成功|error|fail|fault)/i.test(text);
  if (!isErrorState) return html;
  const looksLikeDialog = /(弹窗|对话框|dialog|确认弹窗|双按钮|按钮组|cancel|确认按钮|取消按钮)/i.test(text);
  if (looksLikeDialog) return html;

  const blockRe = /(<!--\s*任务节点开始:[^>]+?(?:【临时】|【持久】)\s*-->)([\s\S]*?)(<!--\s*任务节点结束:[^>]+?(?:【临时】|【持久】)\s*-->)/g;
  let touched = 0;
  const out = html.replace(blockRe, (full, openCmt, inner, closeCmt) => {
    const startTagMatch = inner.match(/<div\b[^>]*style="([^"]*)"[^>]*>/i);
    if (!startTagMatch) return full;
    const styleStr = startTagMatch[1];
    const isFullScreen = /position\s*:\s*fixed/i.test(styleStr) && /inset\s*:\s*0/i.test(styleStr);
    if (!isFullScreen) return full;
    // 已是不透明白底则不动（rgba(...,1) / #fff / #ffffff / rgb(255,255,255)）
    const isOpaqueWhite = /background[^;]*:\s*(rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|#fff(fff)?\b|rgba\([^)]*,\s*1\s*\)|white)\s*;?/i.test(styleStr);
    if (isOpaqueWhite) return full;

    let newStyle = styleStr;
    if (/background[^;]*:/i.test(newStyle)) {
      newStyle = newStyle.replace(/background[^;]*:[^;]*;?/i, "background:rgba(255,255,255,1);");
    } else {
      newStyle = newStyle.replace(/(;?\s*)$/, ";background:rgba(255,255,255,1);");
    }
    if (newStyle === styleStr) return full;
    touched++;
    const newOpenTag = startTagMatch[0].replace(`style="${styleStr}"`, `style="${newStyle}"`);
    const newInner = inner.replace(startTagMatch[0], newOpenTag);
    return `${openCmt}${newInner}${closeCmt}`;
  });
  if (touched > 0 && log) log(`[overlay-opaque] 错误反馈态强制不透明白底：处理 ${touched} 个【临时】块`);
  return out;
}

/**
 * 修复 LLM 在 inline style 里常见的"括号多写一个"语法错。
 *  - `grid-template-columns: repeat(3, minmax(0, 1fr)));`  → 多 1 个 `)`
 *  - `box-shadow: 0 4px 8px rgba(0,0,0,0.1)));`
 *  - `width: calc(100% - 32px));`
 *
 * 关键：**只处理 inline `style="..."` 属性**，**绝不碰 `<style>...</style>` 块**。
 * 原因：D2C base 的 `<style>` 里常含 `background-image: url("data:image/svg+xml;...
 *       matrix(...)...stop-color='rgba(...)'...")` 这种 SVG data URI，字符串内的
 *       SVG 括号会被简单括号计数器误判为不平衡，从而误删合法 `)` 让 base CSS 整段失效
 *       （见 test/1 state_4：base 288 个规则被浏览器只解析到 12 个，行业资讯页退化成纯文本流）。
 *
 * 在 inline style 内也使用"字符串感知"的扫描，跳过 `"..."` / `'...'` / `url(...)` 内的字符。
 */
function fixCssSyntaxErrors(html, log) {
  let touched = 0;
  // 字符串感知的括号计数。返回值为：{ open, close, codeChars }（codeChars 是去掉了字符串和 url() 内容后的纯代码）
  function scanCode(text) {
    let open = 0, close = 0;
    let i = 0;
    const n = text.length;
    const codePos = []; // 每个 "代码态字符" 的索引（用于精确删除）
    while (i < n) {
      const c = text[i];
      // 双引号字符串
      if (c === '"') {
        i++;
        while (i < n && text[i] !== '"') { if (text[i] === "\\") i++; i++; }
        i++; continue;
      }
      // 单引号字符串
      if (c === "'") {
        i++;
        while (i < n && text[i] !== "'") { if (text[i] === "\\") i++; i++; }
        i++; continue;
      }
      // CSS 注释 /* ... */
      if (c === "/" && text[i + 1] === "*") {
        i += 2;
        while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
        i += 2; continue;
      }
      // url(...) - 当作单个 token，跳过内部任意内容直到匹配的 `)`
      if (text.slice(i, i + 4).toLowerCase() === "url(") {
        i += 4;
        let depth = 1;
        while (i < n && depth > 0) {
          if (text[i] === '"' || text[i] === "'") {
            const q = text[i++];
            while (i < n && text[i] !== q) { if (text[i] === "\\") i++; i++; }
            i++;
          } else {
            if (text[i] === "(") depth++;
            else if (text[i] === ")") depth--;
            if (depth > 0) i++;
          }
        }
        i++; // 跳过最后那个 `)`
        continue;
      }
      if (c === "(") { open++; codePos.push(i); }
      else if (c === ")") { close++; codePos.push(i); }
      i++;
    }
    return { open, close, codePos };
  }
  function balanceDecl(decl) {
    const { open, close, codePos } = scanCode(decl);
    if (close <= open) return decl;
    const extra = close - open;
    // 从右往左找"代码态"的 `)` 并删除多余的
    const closeCodeIdx = codePos.filter(p => decl[p] === ")");
    if (closeCodeIdx.length < extra) return decl; // 保守：放弃修
    const toRemove = new Set(closeCodeIdx.slice(-extra));
    let rest = "";
    for (let i = 0; i < decl.length; i++) {
      if (!toRemove.has(i)) rest += decl[i];
    }
    touched += extra;
    return rest;
  }
  function fixStyleBody(styleBody) {
    return styleBody.split(";").map(decl => balanceDecl(decl)).join(";");
  }
  // 只改 inline style="..."（不动 <style>...</style> 块）
  const out = html.replace(/style="([^"]*)"/g, (full, body) => {
    const fixed = fixStyleBody(body);
    return fixed === body ? full : `style="${fixed}"`;
  });
  if (touched > 0 && log) log(`[css-fix] 修复了 ${touched} 处 inline style 多余的右括号（grid/rgba/calc/minmax 语法）`);
  return out;
}

/**
 * LLM 复刻状态栏/导航栏/底 tab 时常常复制原 base D2C 的 id（如 id="6_7924"）。
 * 这会造成同 id 在 DOM 出现 2 次，破坏 CSS / 行为。
 *
 * 策略：扫描每个 `<!-- 任务节点开始: ...-->...<!-- 任务节点结束 -->` 块（即 LLM 新增 UI），
 *       把块内出现的 id="数字_数字"（典型 Pixso D2C id 格式）改成 id="hm-st${state_id}-原id"。
 *       同样处理 class="Pixso-xxx" 内的 D2C class 引用（仅在新块内部）。
 *
 * 兜底：如果同一个 id 在整页 HTML 里出现 ≥ 2 次，给后出现的所有处加 namespace 前缀。
 */
function dedupeDuplicateIds(html, currentReq, log) {
  const stateId = currentReq?.state_id ?? "x";
  const blockRe = /(<!--\s*任务节点开始:[^>]*?(?:【临时】|【持久】)\s*-->)([\s\S]*?)(<!--\s*任务节点结束:[^>]*?(?:【临时】|【持久】)\s*-->)/g;
  let renamed = 0;
  const out = html.replace(blockRe, (full, openCmt, inner, closeCmt) => {
    // 收集 inner 内出现的形如 id="数字_数字" 的 D2C id
    const innerIds = new Set();
    inner.replace(/\bid="(\d+_\d+)"/g, (_, id) => { innerIds.add(id); return _; });
    if (innerIds.size === 0) return full;
    // 检查这些 id 是否也出现在 inner 之外（即原 base 里）
    let newInner = inner;
    for (const id of innerIds) {
      // 全文（不含本 inner）里有这个 id 吗？
      const idRe = new RegExp(`\\bid="${id.replace(/_/g, "_")}"`, "g");
      const total = (html.match(idRe) || []).length;
      const innerCount = (inner.match(idRe) || []).length;
      const baseCount = total - innerCount;
      if (baseCount >= 1) {
        // base 里已存在 → 把 inner 内的所有引用改名
        const newId = `hm-st${stateId}-${id}`;
        newInner = newInner.replace(new RegExp(`\\bid="${id}"`, "g"), `id="${newId}"`);
        // 同时把 class="Pixso-xxx-id" 中以这个 id 结尾的 class 也改一下，避免 D2C 顶层 CSS 选中
        newInner = newInner.replace(new RegExp(`\\bclass="([^"]*?)\\bPixso-([a-z]+)-${id}\\b([^"]*?)"`, "g"),
          (m, p1, p2, p3) => `class="${p1}hm-st${stateId}-${p2}-${id}${p3}"`);
        renamed++;
      }
    }
    if (newInner === inner) return full;
    return `${openCmt}${newInner}${closeCmt}`;
  });
  if (renamed > 0 && log) log(`[dedupe-id] 任务块内复用 base D2C id 已重命名：${renamed} 处`);
  return out;
}

/**
 * 扩展版「全屏面板不透明」：除了 error 态，还覆盖：
 *   - 全屏选择面板 / 全屏选项面板 / 全屏列表 / 全屏新页面
 *   - description / implementation_method 含 "全屏" + "(面板|选项|列表|选择|偏好|设置|新页面)" 的 state
 * 排除：含"弹窗 / 对话框 / Dialog / Toast"等显式语义的（那些走小遮罩+中央卡的模式）。
 */
function enforceOpaqueFullscreenPanel(html, currentReq, log) {
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`;
  const isModalOverlay =
    /(遮罩|半透|居中|卡片|弹窗|对话框|dialog|modal|popup|toast|snackbar|tooltip)/i.test(text) ||
    /(bottom\s*sheet|底部抽屉|底部弹窗)/i.test(text);
  if (isModalOverlay) return html;

  const isFullscreenPanel =
    /(全屏|fullscreen)/i.test(text) && /(面板|选项|列表|选择|偏好|设置|新页面|panel|list)/i.test(text)
    || /(独立页|独立全屏|全新页面|进入.*?页)/i.test(text);
  if (!isFullscreenPanel) return html;
  const looksLikeDialog = /(弹窗|对话框|dialog|toast|snackbar|tooltip|popup|modal|遮罩|半透|居中|卡片)/i.test(text);
  if (looksLikeDialog) return html;

  const blockRe = /(<!--\s*任务节点开始:[^>]*?(?:【临时】|【持久】)\s*-->)([\s\S]*?)(<!--\s*任务节点结束:[^>]*?(?:【临时】|【持久】)\s*-->)/g;
  let touched = 0;
  const out = html.replace(blockRe, (full, openCmt, inner, closeCmt) => {
    const startTagMatch = inner.match(/<div\b[^>]*style="([^"]*)"[^>]*>/i);
    if (!startTagMatch) return full;
    const styleStr = startTagMatch[1];
    const isFullScreen = /position\s*:\s*fixed/i.test(styleStr) && /inset\s*:\s*0/i.test(styleStr);
    if (!isFullScreen) return full;
    // 若 background 已为完全不透明色，跳过
    const isOpaque = /background[^;]*:\s*(?:#[0-9a-f]{3,8}\b|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\([^)]*,\s*1\s*\)|white|black|[a-z]+)\s*[;"]/i.test(styleStr)
      && !/background[^;]*:\s*(?:rgba\([^)]*,\s*0?\.\d+\s*\)|transparent|none)\s*[;"]/i.test(styleStr);
    if (isOpaque) return full;
    let newStyle = styleStr;
    if (/background[^;]*:/i.test(newStyle)) {
      newStyle = newStyle.replace(/background[^;]*:[^;]*;?/i, "background:#FFFFFF;");
    } else {
      newStyle = newStyle.replace(/(;?\s*)$/, ";background:#FFFFFF;");
    }
    if (newStyle === styleStr) return full;
    touched++;
    const newOpenTag = startTagMatch[0].replace(`style="${styleStr}"`, `style="${newStyle}"`);
    const newInner = inner.replace(startTagMatch[0], newOpenTag);
    return `${openCmt}${newInner}${closeCmt}`;
  });
  if (touched > 0 && log) log(`[overlay-opaque-panel] 全屏面板态强制不透明白底：处理 ${touched} 个块`);
  return out;
}

/**
 * 全屏业务页默认只覆盖 app 内容区，保留原 D2C 顶部系统状态栏。
 * LLM 很容易把"全屏页"机械写成 inset:0，导致原状态栏被盖掉后只能手写粗糙状态栏。
 * 当 state 明确要求保留状态栏/时间信号时，把新增任务块的 fixed inset:0 改为 top:32px 覆盖。
 */
function enforcePreservedStatusBarForFullscreen(html, currentReq, log) {
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`;
  const wantsStatusBar = /(保留|沿用|继承|keep|preserve).{0,12}(状态栏|时间|信号|电量|status\s*bar)|状态栏.{0,12}(保留|沿用|继承|keep|preserve)/i.test(text);
  if (!wantsStatusBar) return html;
  const hasContradictoryImmersive = /(隐藏状态栏|覆盖状态栏|沉浸式|immersive|hide\s+status\s*bar|cover\s+status\s*bar)/i.test(text);
  if (hasContradictoryImmersive && log) log("[fullscreen-statusbar] state 同时声明保留/隐藏状态栏，按业务页默认保留状态栏处理");

  const blockRe = /(<!--\s*任务节点开始:[^>]*?(?:【临时】|【持久】)\s*-->)([\s\S]*?)(<!--\s*任务节点结束:[^>]*?(?:【临时】|【持久】)\s*-->)/g;
  let touched = 0;
  const out = html.replace(blockRe, (full, openCmt, inner, closeCmt) => {
    let blockTouched = 0;
    const newInner = inner.replace(/<div\b[^>]*style="([^"]*)"[^>]*>/gi, (tag, styleStr) => {
      if (!/position\s*:\s*fixed/i.test(styleStr)) return tag;
      const isInset0 = /inset\s*:\s*0/i.test(styleStr);
      const isTop0Full = /top\s*:\s*0/i.test(styleStr) && /left\s*:\s*0/i.test(styleStr) && /right\s*:\s*0/i.test(styleStr) && /bottom\s*:\s*0/i.test(styleStr);
      if (!isInset0 && !isTop0Full) return tag;
      let newStyle = styleStr;
      if (isInset0) {
        newStyle = newStyle.replace(/(?:^|;)\s*inset\s*:\s*0\s*;?/i, match => {
          const prefix = match.trim().startsWith(";") ? ";" : "";
          return `${prefix}top:32px;left:0;right:0;bottom:0;`;
        });
      } else {
        newStyle = newStyle.replace(/top\s*:\s*0/i, "top:32px");
      }
      if (newStyle === styleStr) return tag;
      blockTouched++;
      return tag.replace(`style="${styleStr}"`, `style="${newStyle}"`);
    });
    if (blockTouched === 0) return full;
    touched += blockTouched;
    return `${openCmt}${newInner}${closeCmt}`;
  });
  if (touched > 0 && log) log(`[fullscreen-statusbar] 保留状态栏：将 ${touched} 个全屏 inset:0 覆盖层改为 top:32px`);
  return out;
}

/**
 * 保留状态栏的全屏业务页从 top:32px 开始覆盖，状态栏区域会露出 base 页面。
 * 如果 base 页面本身带有一层全屏暗色遮罩（常见于 D2C 导出的弹出卡片/半屏浮层背景），
 * 状态栏就会被压暗。这里只在"全屏业务页 + 保留状态栏"语义下隐藏这种 base 暗遮罩。
 * Dialog / Bottom Sheet / 明确遮罩语义不调用此规则，避免误删弹窗遮罩。
 */
function suppressBaseDarkMaskForPreservedStatusBarFullscreen(html, currentReq, log) {
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`;
  const wantsStatusBar = /(保留|沿用|继承|keep|preserve).{0,12}(状态栏|时间|信号|电量|status\s*bar)|状态栏.{0,12}(保留|沿用|继承|keep|preserve)/i.test(text);
  const isFullscreenPage = /(全屏|fullscreen|独立页|新页面|全新页面|page|panel)/i.test(text);
  const isModal = /(弹窗|对话框|dialog|modal|popup|bottom\s*sheet|底部抽屉|底部弹窗)/i.test(text);
  if (!wantsStatusBar || !isFullscreenPage || isModal) return html;

  const cleanedHtml = html.replace(/\n?<style\b[^>]*\bid=["']hm-fullscreen-hide-base-mask["'][^>]*>[\s\S]*?<\/style>\n?/gi, "\n");
  const baseHtml = cleanedHtml.replace(/<!--\s*任务节点开始:[\s\S]*?<!--\s*任务节点结束:[\s\S]*?-->/gi, "");
  const darkMaskClasses = new Set();
  const styleRuleRe = /\.([A-Za-z0-9_-]+)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = styleRuleRe.exec(cleanedHtml)) !== null) {
    const cls = m[1];
    const body = m[2] || "";
    const appearsInBaseDom = new RegExp(`class=["'][^"']*\\b${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[^"']*["']`, "i").test(baseHtml);
    if (!appearsInBaseDom) continue;
    const hasDarkBg = /background(?:-color)?\s*:\s*rgba\(\s*(?:0|25)\s*,\s*(?:0|25)\s*,\s*(?:0|25)\s*,\s*0?\.[2-6][0-9]*\s*\)/i.test(body);
    const positioned = /position\s*:\s*(?:absolute|fixed)/i.test(body);
    const fullWidth = /width\s*:\s*(?:100%|100vw|3[0-9]{2}px)/i.test(body);
    const fullHeight = /height\s*:\s*(?:100%|100vh|7[0-9]{2}px|8[0-9]{2}px|9[0-9]{2}px)/i.test(body);
    if (hasDarkBg && positioned && fullWidth && fullHeight) darkMaskClasses.add(cls);
  }
  if (darkMaskClasses.size === 0) return cleanedHtml;

  const css = `\n<style id="hm-fullscreen-hide-base-mask">\n${Array.from(darkMaskClasses).map(cls => `.${cls}{display:none !important;}`).join("\n")}\n</style>\n`;
  const out = /<\/head>/i.test(cleanedHtml) ? cleanedHtml.replace(/<\/head>/i, `${css}</head>`) : cleanedHtml.replace(/<\/body>/i, `${css}</body>`);
  if (log) log(`[fullscreen-statusbar] 隐藏全屏业务页下方遗留暗遮罩：${Array.from(darkMaskClasses).join(", ")}`);
  return out;
}

function ensureLoadingIndicator(html, currentReq, log) {
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`.toLowerCase();
  const isLoadingState = /(加载|loading|processing|submitting|提交中|等待|进行中|处理中)/i.test(text);
  if (!isLoadingState) return html;

  // 已有明显 loading 视觉则不重复注入
  if (/(hmspin|progress_activity|spinner|loading-dot|loading-indicator|aria-busy)/i.test(html)) return html;

  const blockName = String(currentReq?.state_name || "加载状态").trim() || "加载状态";
  const snippet = `
<!-- 任务节点开始: ${blockName}【临时】 -->
<style>
@keyframes hmspin { to { transform: rotate(360deg); } }
</style>
<div style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;pointer-events:none;">
  <div aria-busy="true" style="width:42px;height:42px;border:4px solid rgba(0,0,0,0.14);border-top-color:rgba(0,80,217,1);border-radius:50%;animation:hmspin .8s linear infinite;"></div>
</div>
<!-- 任务节点结束: ${blockName}【临时】 -->`;

  log && log("[loading] 检测到加载态但无可见 loading 图标，已注入兜底 spinner");
  return html.replace(/<\/body>/i, `${snippet}\n</body>`);
}

function renameMutatedTempBlocks(html, prevHtml, currentTaskName, log) {
  if (!currentTaskName || !prevHtml) return html;
  const tempRe = /<!--\s*任务节点开始:\s*(.+?)【临时】\s*-->([\s\S]*?)<!--\s*任务节点结束:\s*\1【临时】\s*-->/g;
  const prevBlocks = new Map();
  prevHtml.replace(tempRe, (full, name, inner) => {
    prevBlocks.set(name.trim(), inner.replace(/\s+/g, ""));
    return full;
  });
  return html.replace(tempRe, (full, name, inner) => {
    const trimmed = name.trim();
    if (trimmed === currentTaskName) return full;
    if (!prevBlocks.has(trimmed)) return full;
    const prevInnerCompact = prevBlocks.get(trimmed);
    const currInnerCompact = inner.replace(/\s+/g, "");
    if (prevInnerCompact === currInnerCompact) return full;
    log && log(`[rename] '${trimmed}【临时】' → '${currentTaskName}【临时】'（块内容已被改造）`);
    return `<!-- 任务节点开始: ${currentTaskName}【临时】 -->${inner}<!-- 任务节点结束: ${currentTaskName}【临时】 -->`;
  });
}

/** 检测 HTML 画布尺寸：手机（360px）/桌面（1920px）/未知。 */
function detectPlatform(html) {
  if (/width:\s*1920px/.test(html) || /<meta[^>]*viewport[^>]*width=1920/i.test(html)) return "desktop";
  if (/width:\s*360px/.test(html) || /<meta[^>]*viewport[^>]*width=device/i.test(html)) return "mobile";
  return "";
}

/**
 * 对"整页 HTML"裁出 body-only 模式；大于 ~2500 行时启用。
 * 返回 { feedHtml, useBodyOnly, bodyMatchInfo }。
 */
function pickFeedHtml(fullHtml, maxLines = 2500) {
  const lineCount = (fullHtml.match(/\n/g) || []).length + 1;
  const bodyMatch = fullHtml.match(/<body\b[^>]*>[\s\S]*?<\/body>/i);
  if (!bodyMatch) throw new Error("未找到 <body>...</body>");
  if (lineCount > maxLines) {
    return { feedHtml: bodyMatch[0], useBodyOnly: true, bodyMatch };
  }
  return { feedHtml: fullHtml, useBodyOnly: false, bodyMatch };
}

/** 把 patched 片段拼回 full 或直接用 full。 */
function reassembleHtml(fullHtml, patchedFragment, bodyMatch, useBodyOnly) {
  if (!useBodyOnly) return patchedFragment;
  return fullHtml.slice(0, bodyMatch.index) + patchedFragment + fullHtml.slice(bodyMatch.index + bodyMatch[0].length);
}

/**
 * 给单个 requirement 生成新 HTML。
 * 输入：上一态的完整 HTML + 当前 requirement。
 * 输出：应用补丁后的完整 HTML。
 *
 * 流程：
 *   1) 文本 LLM 生成 [OLD]/[NEW] 替换块 → 应用到 prevHtml
 *   2) 展开 [HM:Tag] 占位标签为 D2C HTML
 *   3) （可选）vision review：截图 → qwen-vl-max 评审 → 必要时让模型给修订块再次 apply
 *      只有在 deps.callVisionJSON 可用、且 reviewBaseDir 提供时才启用
 */
async function patchOneState({ prevHtml, currentReq, allRequirements, platformHint, log, assetPrefix, reviewBaseDir }) {
  // ─── baseline 路径（feature flag 控制；最高优先级；命中即短路，绝不回落） ──
  // 用作 twoPhase 的对照组：一锤子整页 HTML 重写。HM_BASELINE_ENABLED=1 时启用。
  if (isBaselineEnabled()) {
    log && log("[baseline] HM_BASELINE_ENABLED=1，走 baseline 一锤子路径（跳过 twoPhase / DSL / legacy）");
    const r = await hmPatchViaBaseline({
      prevHtml,
      currentReq,
      allRequirements,
      log,
      llmDeps,
    });
    log && log(`[baseline] 成功（html ${r.html.length}B applied=${r.applied}）`);
    return r;
  }

  // ─── twoPhase 路径（feature flag 控制；优先级次之；失败回落到 DSL/legacy） ──
  if (isTwoPhaseEnabled()) {
    try {
      log && log(`[twoPhase] HM_TWOPHASE_ENABLED=1，尝试 twoPhase 路径${TWOPHASE_STRICT ? "（严格模式：失败不兜底）" : ""}`);
      const r = await hmPatchViaTwoPhase({
        prevHtml,
        currentReq,
        allRequirements,
        log,
        llmDeps,
        assetPrefix,
      });
      log && log(`[twoPhase] 成功（html ${r.html.length}B applied=${r.applied} hmExpand=${r.hmExpansions?.length || 0}），跳过 DSL/legacy`);
      return r;
    } catch (e) {
      if (TWOPHASE_STRICT) {
        log && log(`[twoPhase] 失败 (${e.message})，HM_TWOPHASE_STRICT=1 严格模式：直接抛错，不兜底到 DSL/legacy`);
        throw new Error(`twoPhase 失败（严格模式不兜底）：${e.message}`);
      }
      log && log(`[twoPhase] 失败 (${e.message})，回落到下一级（DSL 或 legacy）`);
    }
  }

  // ─── HM DSL 路径分支（feature flag 控制；失败自动回落到 [OLD]/[NEW]） ──
  // 注意：在 HM_TWOPHASE_STRICT=1 模式下不会到达这里（上面已抛错）
  if (HM_DSL_ENABLED && hmShouldUseDsl(currentReq)) {
    try {
      log && log(`[dsl] HM_DSL_ENABLED=1 且匹配，尝试 DSL 路径`);
      const r = await hmPatchViaDsl({
        prevHtml,
        currentReq,
        allRequirements,
        log,
        assetPrefix,
        llmDeps,
      });
      log && log(`[dsl] 成功（html ${r.html.length}B），跳过旧路径`);
      return r;
    } catch (e) {
      log && log(`[dsl] 失败 (${e.message})，回落到 [OLD]/[NEW] 字符串路径`);
    }
  }

  const { feedHtml, useBodyOnly, bodyMatch } = pickFeedHtml(prevHtml);

  // 隐藏上一任务残留的【临时】块；当前任务 + last_state 视觉血统链上的【临时】块也保留为基底
  const taskName = (currentReq.state_name || "").trim();
  const ancestorNames = collectAncestorNames(currentReq, allRequirements);
  const keepNames = [taskName, ...ancestorNames].filter(Boolean);
  let workingHtml = hideAllTempUi(feedHtml, keepNames);
  workingHtml = fixDisplayConflicts(workingHtml);

  const prompt = buildPatchPrompt({
    currentReq,
    html: workingHtml,
    allRequirements,
    bodyOnlyMode: useBodyOnly,
    platformHint,
  });

  log && log(`prompt 长度 ${(prompt.length / 1024).toFixed(1)}KB，调用模型…`);
  // 完整的 2 次重试：覆盖「LLM 空返回 / 异常 / </div> 海 / parseBlocks=0」
  // 每次失败都换 temperature 扰动，避免相同温度产生相同问题输出。
  const RETRY_TEMPERATURES = [0, 0.35];
  let raw = "";
  let content = "";
  let blocks = [];
  let lastFailureMsg = "";
  for (let attempt = 1; attempt <= RETRY_TEMPERATURES.length; attempt++) {
    const temperature = RETRY_TEMPERATURES[attempt - 1];
    let r = "";
    try {
      r = await llmDeps.callText("", prompt, { temperature });
    } catch (e) {
      lastFailureMsg = `LLM 调用异常：${e.message || e}`;
      log && log(`[warn] 第 ${attempt} 次 ${lastFailureMsg}，${attempt < RETRY_TEMPERATURES.length ? `重试(temp=${RETRY_TEMPERATURES[attempt]})…` : "放弃"}`);
      continue;
    }
    if (typeof r !== "string" || !r.trim()) {
      lastFailureMsg = "LLM 返回空";
      log && log(`[warn] 第 ${attempt} 次 LLM 返回空，${attempt < RETRY_TEMPERATURES.length ? `重试(temp=${RETRY_TEMPERATURES[attempt]})…` : "放弃"}`);
      continue;
    }
    const c = stripCodeFences(r);
    if ((c.toLowerCase().match(/<\/div>/g) || []).length > 500) {
      lastFailureMsg = "模型输出疑似 </div> 海";
      log && log(`[warn] 第 ${attempt} 次 ${lastFailureMsg}（${(c.match(/<\/div>/gi) || []).length} 个 </div>），${attempt < RETRY_TEMPERATURES.length ? `重试(temp=${RETRY_TEMPERATURES[attempt]})…` : "放弃"}`);
      continue;
    }
    // 零块字面意图：LLM 按 prompt 教学输出"0 个 [OLD]/[NEW] 块"等无操作意图字面文本，
    // 直接走 graceful 零块分支，避免 parseBlocks 误把字面 [OLD]/[NEW] 当作分隔符产生伪块。
    const trimmed = c.trim();
    const isZeroBlockIntent =
      trimmed.length < 200 &&
      (/^0\s*个\s*\[OLD\]/i.test(trimmed) ||
       /^[\s\S]{0,40}(没有|无)\s*(需要)?\s*(替换|修改|变化|change)/i.test(trimmed) ||
       /^\s*(no\s*changes?|no\s*op|nothing\s*to\s*change)\s*$/i.test(trimmed));
    if (isZeroBlockIntent) {
      log && log(`[noop] LLM 明确表达"零块"意图（${trimmed.length}B），跳过 parseBlocks，沿用上一态 HTML`);
      raw = r;
      content = c;
      blocks = [];
      break;
    }
    const b = parseBlocks(c);
    if (!b.length) {
      // 注：parseBlocks=0 不算硬失败 —— 历史上该分支是"无替换块就保持原 HTML"。
      // 这里只在 attempt=1 时重试一次，给 LLM 一次纠正机会；attempt=2 仍 0 块则正常走 graceful 分支。
      if (attempt < RETRY_TEMPERATURES.length) {
        lastFailureMsg = "未解析出 [OLD]/[NEW] 块";
        log && log(`[warn] 第 ${attempt} 次 ${lastFailureMsg}，重试(temp=${RETRY_TEMPERATURES[attempt]})…`);
        continue;
      }
    }
    // 成功 —— 退出 retry loop
    raw = r;
    content = c;
    blocks = b;
    if (attempt > 1) log && log(`[retry] 第 ${attempt} 次成功（temp=${temperature}），解析到 ${blocks.length} 个块`);
    break;
  }

  if (!raw) {
    log && log(`LLM 多次失败（${lastFailureMsg}），跳过本 state，沿用上一态 HTML`);
    return { html: prevHtml, applied: 0, skipped: 0, raw: "" };
  }

  log && log(`解析到 ${blocks.length} 个 [OLD]/[NEW] 替换块`);
  if (!blocks.length) {
    log && log("未解析出任何替换块，保持原 HTML 不变");
    return { html: prevHtml, applied: 0, skipped: 0, raw: content };
  }

  const { html: patchedFragment, appliedCount, skippedCount } = applyReplacementsInMemory(workingHtml, blocks, {
    log: (m) => log && log(m),
  });

  let patched = reassembleHtml(prevHtml, patchedFragment, bodyMatch, useBodyOnly);

  // ─── Legacy 路径的 11 步后处理（feature flag 控制） ───────────────
  // 设置 HM_LEGACY_POSTPROC_ENABLED=0 可关闭所有后处理（用于评估基线 LLM 直出能力）。
  // 默认开。关闭时，hmExpansions / review / 各种 enforce* 修复全部跳过。
  let hmExpansions = [];
  let hmMissing = [];
  let reviewMeta = null;
  let reviewApplied = 0;

  if (LEGACY_POSTPROC_ENABLED) {
    // ① ② ③ ④ 浮层规整
    patched = enforceOverlayTopLimit(patched);
    patched = enforceOverlayZIndex(patched);
    patched = renameMutatedTempBlocks(patched, prevHtml, taskName, log);
    patched = wrapNakedOverlays(patched, prevHtml, taskName, log);

    // ⑤ HM 组件展开：把 [NEW] 块里残留的 [HM:Tag ...] 占位标签替换为真实组件 HTML
    const expanded = expandHmTags(patched, {
      log: (m) => log && log(m),
      assetPrefix: assetPrefix || "_hm-assets",
    });
    if (expanded.expanded > 0) log && log(`[HM] 替换 ${expanded.expanded} 个组件占位标签` + (expanded.missing.length ? `（缺失：${expanded.missing.join(",")}）` : ""));
    patched = expanded.html;
    hmExpansions = expanded.expansions || [];
    hmMissing = expanded.missing || [];

    // ⑥ ⑦ ⑧ 语义级硬约束
    patched = ensureLoadingIndicator(patched, currentReq, log);
    patched = enforceOpaqueErrorOverlay(patched, currentReq, log);
    patched = enforceOpaqueFullscreenPanel(patched, currentReq, log);
    patched = enforcePreservedStatusBarForFullscreen(patched, currentReq, log);
    patched = suppressBaseDarkMaskForPreservedStatusBarFullscreen(patched, currentReq, log);
    // ⑨ ⑩ 语法 fix + id 去重
    patched = fixCssSyntaxErrors(patched, log);
    patched = dedupeDuplicateIds(patched, currentReq, log);

    // ⑪ Vision Review（可选；仅评审不自动修复，避免 review 越改越差）
    if (llmDeps?.callVisionJSON && reviewBaseDir) {
      try {
        const r = await reviewAndFix({
          html: patched,
          currentReq,
          prevBlocksRaw: content,
          baseDir: reviewBaseDir,
          deps: { callVisionJSON: llmDeps.callVisionJSON },
          log,
        });
        reviewMeta = r.review || null;
        reviewApplied = 0;
        patched = r.html;
      } catch (e) {
        log && log(`[review] 异常跳过：${e.message}`);
      }
    }
  } else {
    log && log(`[postproc] HM_LEGACY_POSTPROC_ENABLED=0，跳过全部 11 步后处理（基线评估模式）`);
  }

  return {
    html: patched,
    applied: appliedCount,
    skipped: skippedCount,
    raw: content,
    hmExpansions,
    hmMissing,
    review: reviewMeta,
    reviewApplied,
  };
}

/**
 * 主生成流程：SSE 版。
 *  - emit(event, data) 每步触发（sse / 回放数组都用同一个 emit）
 *  - 写入目录：若用户提供 sourceDir 则写到 <sourceDir>/_taskflow_<ts>/；否则写到 SAVE_ROOT/<ts>_slug/
 *  - 每个 state 完成即发 "state-done" 事件
 */
async function runPatchPipeline(session, emit) {
  const { blueprint, seed } = session;
  if (!blueprint) throw new Error("blueprint missing");
  const blueprintValidation = validateBlueprint(blueprint);
  if (!blueprintValidation.ok) {
    throw new Error(`blueprint invalid: ${blueprintValidation.issues.join("; ")}`);
  }

  // ── antdOneShot 路径（HM_ANTD_ENABLED=1）─────────────────────────
  // 单次 LLM 调用产出 happy path 上所有 state 的 OLD/NEW + antd-mobile JSX islands。
  // 失败不会回落 —— 因为这是一条主动选择的实验路径，回落到 per-state 反而掩盖问题。
  if (isAntdOneShotEnabled()) {
    emit("pipeline", { msg: "[pipeline] HM_ANTD_ENABLED=1，走 antdOneShot 单调用路径" });
    return await runAntdOneShotPipeline(session, emit, {
      llmDeps,
      SAVE_ROOT,
      withBaseHref,
    });
  }

  const states = blueprint.states.slice().sort((a, b) => a.state_id - b.state_id);

  const slug = (blueprint.meta?.slug || "taskflow").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  // 决定输出目录：优先复用 Phase 1 结束时 persistTaskflowJson 已经创建的 outDir
  let outDir, savedInSource = false;
  if (session.generation?.outDir) {
    outDir = session.generation.outDir;
    savedInSource = !!session.generation.savedInSource;
  } else {
    const ts = timestampTag();
    if (seed.sourceDir) {
      outDir = path.join(seed.sourceDir, `_taskflow_${ts}`);
      savedInSource = true;
    } else {
      outDir = path.join(SAVE_ROOT, `${ts}_${slug}`);
    }
    await ensureDir(outDir);
  }

  emit("prepare", { msg: "预处理基线 HTML…", outDir, savedInSource });

  // 把鸿蒙组件 D2C 资源（图片/字体）就地放到合适位置，使生成的 HTML 双击 file://
  // 即可预览：
  //  - savedInSource=true（输出在 sourceDir/_taskflow_<ts>/）：state HTML 注入了
  //    <base href="../">，相对路径 "_hm-assets/<sub>" 会解析成 sourceDir/_hm-assets/<sub>，
  //    所以把缓存复制到 <sourceDir>/_hm-assets/。
  //  - savedInSource=false（输出在 SAVE_ROOT/<ts>_slug/）：没有 <base>，HTML 中
  //    "_hm-assets/<sub>" 直接相对 outDir 解析，所以复制到 <outDir>/_hm-assets/。
  let assetPrefix = "_hm-assets";
  try {
    const assetTarget = savedInSource && seed.sourceDir
      ? path.join(seed.sourceDir, "_hm-assets")
      : path.join(outDir, "_hm-assets");
    const cp = await assetCache.copyCacheTo(assetTarget);
    emit("assets", {
      msg: `鸿蒙资源就位（复制 ${cp.copied}，复用 ${cp.skipped}）`,
      target: assetTarget,
    });
  } catch (e) {
    emit("assets", { msg: `鸿蒙资源复制失败：${e.message}（生成仍继续，预览图标可能缺失）` });
  }

  // 基线（state_1）—— 预注入 icon 字体（HMSymbolVF + Material Icons Round + .mi class）
  // 这是基础设施层：所有 state（DSL / Legacy / 无后处理）都共用同一份 baseline，
  // 一次性注入后，后续 patch 出现的 <span class="mi"> 一律有字体可用，无需依赖 expandHmTags 后处理。
  const baselineSanitized = injectIconFontIfNeeded(
    sanitizeBaseline(seed.html),
    assetPrefix,
    { force: true }
  );
  const platformHint = detectPlatform(seed.html) || blueprint.meta?.platform || "";
  emit("platform", { platform: platformHint || "(未识别)" });

  // 若 state_1 的 HTML 要保存在输出目录，需要能访问相对资源：
  //  - 存到 outDir 下：必须注入 <base href="../"> 让 <img src="image.png"> 指向 sourceDir
  const stateHtmlMap = {}; // state_id → full HTML (in-memory)
  stateHtmlMap[1] = baselineSanitized;
  const stateQualityMap = new Map();

  // 写 state_1 文件（可直接预览）
  const state1FilePath = path.join(outDir, `state_1.html`);
  await fs.writeFile(state1FilePath, withBaseHref(baselineSanitized, savedInSource), "utf-8");
  const state1Final = await writeFinalScreenshot({
    html: withBaseHref(baselineSanitized, savedInSource),
    htmlFilePath: state1FilePath,
    outPath: path.join(outDir, "state_1_final.png"),
    baseDir: outDir,
  });
  const state1Validation = await validateStateHtml({
    html: withBaseHref(baselineSanitized, savedInSource),
    htmlFilePath: state1FilePath,
    state: states[0] || { state_id: 1, state_name: "初始态" },
    baseDir: outDir,
    includeViewport: true,
  });
  stateQualityMap.set(1, {
    finalScreenshot: state1Final.ok ? state1Final.file : null,
    finalScreenshotOk: state1Final.ok,
    finalScreenshotError: state1Final.reason || null,
    reviewOk: null,
    reviewStatus: "not_applicable",
    reviewIssues: [],
    validationOk: state1Validation.ok,
    validationIssues: state1Validation.issues,
    assetWarnings: state1Validation.assetWarnings,
    quality_failed: !state1Final.ok || !state1Validation.ok,
  });
  const state1Event = {
    state_id: 1,
    state_name: states[0]?.state_name || "初始态",
    file: path.relative(outDir, state1FilePath).replace(/\\/g, "/"),
    finalScreenshot: state1Final.ok ? state1Final.file : null,
    validation_ok: state1Validation.ok,
    validation_issues: state1Validation.issues,
    asset_warnings: state1Validation.assetWarnings,
    quality_failed: !state1Final.ok || !state1Validation.ok,
    applied: 0,
    skipped: 0,
  };
  emit(state1Event.quality_failed ? "state-fail" : "state-done", state1Event);

  const allRequirements = states.map(s => ({
    state_id: s.state_id,
    state_name: s.state_name,
    description: s.description,
    implementation_method: s.implementation_method,
    last_state: s.last_state,
  }));

  // 按 state_id 升序串行（支持 last_state 依赖链）
  for (const st of states) {
    if (st.state_id === 1) continue;
    if (st.last_state === null || st.last_state === undefined) {
      emit("state-fail", { state_id: st.state_id, error: "last_state 缺失" });
      continue;
    }
    const lastId = st.last_state;
    const prevHtml = stateHtmlMap[lastId];
    if (!prevHtml) {
      emit("state-fail", { state_id: st.state_id, error: `last_state=${lastId} 尚未生成` });
      continue;
    }

    emit("state-start", { state_id: st.state_id, state_name: st.state_name, last_state: lastId });
    const t0 = Date.now();
    const logs = [];
    const log = (m) => { logs.push(m); emit("state-log", { state_id: st.state_id, msg: m }); };

    try {
      // 截图需要的 baseDir：savedInSource 时 outDir 是 sourceDir/_taskflow_<ts>/，
      // 注入了 <base href="../"> → 用 sourceDir 作为 baseDir 让相对资源 (image.png / css/...)
      // 能解析；非 savedInSource 时直接用 outDir。
      const reviewBaseDir = savedInSource && session.seed.sourceDir ? session.seed.sourceDir : outDir;

      const { html, applied, skipped, raw, hmExpansions, hmMissing, review, reviewApplied } = await patchOneState({
        prevHtml,
        currentReq: {
          state_id: st.state_id,
          state_name: st.state_name,
          description: st.description,
          implementation_method: st.implementation_method,
          last_state: st.last_state,
        },
        allRequirements,
        platformHint,
        log,
        assetPrefix,
        reviewBaseDir,
      });

      // 保存调试输出
      await fs.writeFile(
        path.join(outDir, `state_${st.state_id}_raw_blocks.txt`),
        raw || "", "utf-8"
      );
      // 持久化"该 state 用了哪些 HM 组件 → D2C 节点"（便于审计/记录）
      await fs.writeFile(
        path.join(outDir, `state_${st.state_id}_components.json`),
        JSON.stringify({
          state_id: st.state_id,
          state_name: st.state_name,
          components: hmExpansions || [],
          missing: hmMissing || [],
          review: review || null,
        }, null, 2),
        "utf-8"
      );

      stateHtmlMap[st.state_id] = html;
      const filePath = path.join(outDir, `state_${st.state_id}.html`);
      const persistedHtml = withBaseHref(html, savedInSource);
      await fs.writeFile(filePath, persistedHtml, "utf-8");

      const finalShot = await writeFinalScreenshot({
        html: persistedHtml,
        htmlFilePath: filePath,
        outPath: path.join(outDir, `state_${st.state_id}_final.png`),
        baseDir: outDir,
      });
      const stateValidation = await validateStateHtml({
        html: persistedHtml,
        htmlFilePath: filePath,
        state: st,
        baseDir: outDir,
        includeViewport: true,
      });
      const reviewStatus = review
        ? (review.ok === true ? "ok" : "failed")
        : (llmDeps?.callVisionJSON ? "review_unavailable" : "review_unavailable");
      const reviewIssues = review?.issues || (reviewStatus === "review_unavailable" ? ["review_unavailable"] : []);
      const qualityFailed = !finalShot.ok || !stateValidation.ok || reviewStatus !== "ok";
      const quality = {
        finalScreenshot: finalShot.ok ? finalShot.file : null,
        finalScreenshotOk: finalShot.ok,
        finalScreenshotError: finalShot.reason || null,
        reviewOk: review ? !!review.ok : false,
        reviewStatus,
        reviewIssues,
        validationOk: stateValidation.ok,
        validationIssues: stateValidation.issues,
        assetWarnings: stateValidation.assetWarnings,
        quality_failed: qualityFailed,
      };
      stateQualityMap.set(st.state_id, quality);

      const eventPayload = {
        state_id: st.state_id,
        state_name: st.state_name,
        file: path.relative(outDir, filePath).replace(/\\/g, "/"),
        applied, skipped,
        review_ok: quality.reviewOk,
        review_status: reviewStatus,
        review_applied: reviewApplied || 0,
        review_issues: reviewIssues,
        validation_ok: stateValidation.ok,
        validation_issues: stateValidation.issues,
        asset_warnings: stateValidation.assetWarnings,
        finalScreenshot: quality.finalScreenshot,
        elapsed_ms: Date.now() - t0,
        hmExpansions: hmExpansions || [],
        hmMissing: hmMissing || [],
        quality_failed: qualityFailed,
      };

      emit(qualityFailed ? "state-fail" : "state-done", qualityFailed ? { ...eventPayload, error: "quality validation failed" } : eventPayload);
    } catch (e) {
      emit("state-fail", { state_id: st.state_id, error: e.message, elapsed_ms: Date.now() - t0 });
      // 失败态也落盘调试日志，确保可追溯：至少包含 error + state-log 全量。
      await fs.writeFile(
        path.join(outDir, `state_${st.state_id}_raw_blocks.txt`),
        [
          `[state-fail] ${e.message || "unknown error"}`,
          "",
          "--- state logs ---",
          ...(logs || []),
        ].join("\n"),
        "utf-8"
      );
      // 失败时沿用上一态 HTML 作为该 state 的快照，避免阻塞后续 state
      stateHtmlMap[st.state_id] = prevHtml;
    }
  }

  // 写 manifest
  const manifest = {
    title: blueprint.meta?.title || "Untitled Taskflow",
    slug,
    createdAt: new Date().toISOString(),
    meta: blueprint.meta,
    blueprintValidation,
    blueprintIntentReview: session.blueprintIntentReview || null,
    blueprintIntentRisk: !!session.blueprintIntentReview?.continuedWithRisk,
    states: states.map(s => ({
      state_id: s.state_id,
      state_name: s.state_name,
      description: s.description,
      implementation_method: s.implementation_method,
      last_state: s.last_state ?? null,
      file: `state_${s.state_id}.html`,
      ...(stateQualityMap.get(s.state_id) || {
        finalScreenshot: null,
        reviewOk: false,
        reviewIssues: ["state_not_generated"],
        validationOk: false,
        assetWarnings: [],
        quality_failed: true,
      }),
    })),
  };
  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  // Phase 1 已经写过 taskflow.json（扁平结构），这里再写一次 requirements 快照作为生成时使用的参数回档
  await fs.writeFile(path.join(outDir, "taskflow.requirements.json"), JSON.stringify(allRequirements, null, 2), "utf-8");

  session.generation = { slug, outDir, savedInSource, sourceDir: seed.sourceDir || null, manifest, dirName: path.basename(outDir) };
  emit("done", {
    slug,
    outDir,
    savedInSource,
    dirName: path.basename(outDir),
    states: manifest.states,
  });
  return session.generation;
}

/** 在生成的 state HTML 的 <head> 内注入 <base href="../">，让相对资源指向源目录。 */
function withBaseHref(html, savedInSource) {
  if (!savedInSource) return html;
  if (/<base\b/i.test(html)) return html;
  return html.replace(/<head\b([^>]*)>/i, (m) => `${m}\n  <base href="../">`);
}

// ─────────────────────────────────────────────────────────────
//  Route registration
// ─────────────────────────────────────────────────────────────
function registerRoutes(app, deps) {
  bindLLM(deps);

  // Start
  app.post("/api/oneclick/start", async (req, res) => {
    try {
      const { html, brief, imageName, sourceDir } = req.body || {};
      if (!html || !String(html).trim()) return res.status(400).json({ message: "请提供初始 HTML" });

      // 安全校验：sourceDir 必须是存在的目录
      let safeSourceDir = "";
      if (sourceDir && typeof sourceDir === "string") {
        try {
          const st = await fs.stat(sourceDir);
          if (st.isDirectory()) safeSourceDir = path.resolve(sourceDir);
        } catch { /* ignore */ }
      }

      const id = newSessionId();
      const session = {
        id, createdAt: Date.now(),
        seed: {
          html: String(html),
          brief: String(brief || "").trim(),
          imageName: imageName || "",
          hasImage: !!imageName,
          sourceDir: safeSourceDir || "",
        },
        phase: 1, qaHistory: [], blueprint: null, generation: null,
      };
      sessions.set(id, session);

      const raw = await callPhase(1, session.seed, session.qaHistory);
      if (!raw || raw.action !== "ask") return res.status(500).json({ message: "LLM 未返回有效问题", raw });
      const q = shapeQuestion(raw, 1);
      session.lastQuestion = q;
      return res.json({ sessionId: id, question: q, sourceDir: safeSourceDir });
    } catch (e) {
      console.error("[oneclick/start]", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Answer
  app.post("/api/oneclick/answer", async (req, res) => {
    try {
      const { sessionId, answerIds = [], customText = "", pickedLabels = [] } = req.body || {};
      const session = sessions.get(sessionId);
      if (!session) return res.status(404).json({ message: "会话不存在" });

      const phase = session.phase;
      const answerLabels = pickedLabels.length ? pickedLabels : answerIds.map(id => `(${id})`);
      const answerText = [
        answerLabels.filter(Boolean).join(" | "),
        customText ? `【补充】${customText}` : "",
      ].filter(Boolean).join("  ");

      const lastQuestion = session.lastQuestion || {};
      session.qaHistory.push({
        phase,
        questionText: lastQuestion.questionText || "",
        options: lastQuestion.options || [],
        answerIds, customText, answerLabels, answerText,
      });

      const nextPhase = phase + 1;
      session.phase = nextPhase;

      if (nextPhase <= 3) {
        const raw = await callPhase(nextPhase, session.seed, session.qaHistory);
        if (!raw) return res.status(500).json({ message: "LLM 返回空" });
        if (raw.action === "done" && raw.blueprint) {
          const accepted = await acceptGeneratedBlueprint({ session, raw, phase: nextPhase });
          return res.json({
            sessionId,
            blueprint: accepted.blueprint,
            validation: accepted.validation,
            intentReview: accepted.intentReview,
            repaired: accepted.repaired,
            done: true,
            taskflow: accepted.saved,
          });
        }
        const q = shapeQuestion(raw, nextPhase);
        session.lastQuestion = q;
        return res.json({ sessionId, question: q, done: false });
      }

      // Phase 4 = 产出最终蓝图
      const raw = await callPhase(4, session.seed, session.qaHistory);
      const accepted = await acceptGeneratedBlueprint({ session, raw, phase: 4 });
      return res.json({
        sessionId,
        blueprint: accepted.blueprint,
        validation: accepted.validation,
        intentReview: accepted.intentReview,
        repaired: accepted.repaired,
        done: true,
        taskflow: accepted.saved,
      });
    } catch (e) {
      console.error("[oneclick/answer]", e);
      res.status(500).json({ message: e.message, validation: e.validation || null, raw: e.raw || undefined });
    }
  });

  app.post("/api/oneclick/blueprint", async (req, res) => {
    try {
      const { sessionId, blueprint } = req.body || {};
      const session = sessions.get(sessionId);
      if (!session) return res.status(404).json({ message: "会话不存在" });
      const validation = validateBlueprint(blueprint);
      if (!validation.ok) {
        return res.status(400).json({ ok: false, message: "blueprint invalid", validation });
      }
      const intentReview = await reviewBlueprintIntent({ seed: session.seed, blueprint });
      session.blueprintIntentReview = {
        ...intentReview,
        ok: intentReview.score >= BLUEPRINT_INTENT_PASS_SCORE,
        repaired: false,
        continuedWithRisk: intentReview.score < BLUEPRINT_INTENT_PASS_SCORE,
        passScore: BLUEPRINT_INTENT_PASS_SCORE,
        repairAcceptScore: BLUEPRINT_INTENT_REPAIR_ACCEPT_SCORE,
        decision: intentReview.score >= BLUEPRINT_INTENT_PASS_SCORE ? "pass" : "continue_with_risk",
      };
      session.blueprint = blueprint;
      // 手动覆盖蓝图时同样落盘新的 taskflow.json（复用已存在的 outDir）
      const saved = await persistTaskflowJson(session);
      return res.json({ ok: true, validation, intentReview: session.blueprintIntentReview, taskflow: saved });
    } catch (e) {
      console.error("[oneclick/blueprint]", e);
      return res.status(500).json({ ok: false, message: e.message, validation: e.validation || null });
    }
  });

  app.get("/api/oneclick/session/:id", (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ message: "not found" });
    return res.json({
      id: s.id, phase: s.phase,
      qaHistory: s.qaHistory,
      blueprint: s.blueprint,
      blueprintIntentReview: s.blueprintIntentReview || null,
      lastQuestion: s.lastQuestion || null,
      generation: s.generation ? { slug: s.generation.slug, dirName: s.generation.dirName, savedInSource: s.generation.savedInSource } : null,
      sourceDir: s.seed.sourceDir,
    });
  });

  // 兼容旧版：一次性生成 + 事件数组返回
  app.post("/api/oneclick/generate", async (req, res) => {
    const { sessionId } = req.body || {};
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ message: "会话不存在" });
    if (!session.blueprint) return res.status(400).json({ message: "尚未产出蓝图" });

    const events = [];
    const emit = (type, data) => events.push({ type, ...data, ts: Date.now() });
    try {
      const result = await runPatchPipeline(session, emit);
      return res.json({ ok: true, slug: result.slug, dir: result.dirName, dirName: result.dirName, outDir: result.outDir, savedInSource: result.savedInSource, manifest: result.manifest, events });
    } catch (e) {
      console.error("[oneclick/generate]", e);
      res.status(500).json({ message: e.message, events });
    }
  });

  // SSE 流式生成：每个 state 完成即推送一个事件
  app.get("/api/oneclick/generate/stream", async (req, res) => {
    const sessionId = req.query.sessionId;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ message: "会话不存在" });
    if (!session.blueprint) return res.status(400).json({ message: "尚未产出蓝图" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders && res.flushHeaders();

    const send = (type, data) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify({ ...data, ts: Date.now() })}\n\n`);
    };
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);

    try {
      await runPatchPipeline(session, send);
      send("end", { ok: true });
    } catch (e) {
      console.error("[oneclick/generate/stream]", e);
      send("error", { message: e.message });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  });

  app.get("/api/oneclick/list", async (_req, res) => {
    try {
      await ensureDir(SAVE_ROOT);
      const names = await fs.readdir(SAVE_ROOT);
      const items = [];
      for (const n of names) {
        try {
          const mani = JSON.parse(await fs.readFile(path.join(SAVE_ROOT, n, "manifest.json"), "utf-8"));
          items.push({ dir: n, title: mani.title, createdAt: mani.createdAt, states: mani.states?.length || 0, slug: mani.slug });
        } catch { /* skip */ }
      }
      items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      res.json({ items });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/oneclick/result/:dir", async (req, res) => {
    try {
      const txt = await fs.readFile(path.join(SAVE_ROOT, req.params.dir, "manifest.json"), "utf-8");
      res.type("application/json").send(txt);
    } catch {
      res.status(404).json({ message: "not found" });
    }
  });

  // 按 session 提供"源 HTML 同目录"下的资源服务（用于 iframe src 和相对 image 资源）
  // GET /api/oneclick/serve/:sessionId/*?path=... → 读取 session.generation.outDir/<rest>
  app.get("/api/oneclick/serve/:sessionId/*rest", async (req, res) => {
    const sid = req.params.sessionId;
    const session = sessions.get(sid);
    if (!session || !session.generation) return res.status(404).send("not found");
    const rest = req.params.rest;
    const rel = Array.isArray(rest) ? rest.join("/") : (rest || "");
    const roots = [session.generation.outDir];
    if (session.generation.sourceDir) roots.push(session.generation.sourceDir);
    for (const root of roots) {
      const abs = path.resolve(root, rel);
      if (!abs.startsWith(path.resolve(root))) continue;
      try {
        const data = await fs.readFile(abs);
        const ext = path.extname(abs).toLowerCase();
        const ctype = ({
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "application/javascript; charset=utf-8",
          ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
          ".ttf": "font/ttf", ".otf": "font/otf",
          ".woff": "font/woff", ".woff2": "font/woff2",
          ".json": "application/json; charset=utf-8",
        })[ext] || "application/octet-stream";

        // HTML 通过 API 预览时：
        //   原 <base href="../"> 是为"file:// 直接打开"设计的（指回源目录）。
        //   但通过 /api/oneclick/serve/<sid>/state_X.html 访问时，<base href="../">
        //   会让 <img src="image.png"> 解析成 /api/oneclick/serve/image.png（少了 sid），
        //   导致 404。这里在响应里**移除** <base>，让相对资源回到
        //   /api/oneclick/serve/<sid>/image.png，由本路由按 outDir → sourceDir 回退查找。
        if (ext === ".html") {
          let html = data.toString("utf-8");
          html = html.replace(/<base\b[^>]*>\s*/gi, "");
          res.type(ctype).send(html);
          return;
        }
        res.type(ctype).send(data);
        return;
      } catch { /* try next root */ }
    }
    res.status(404).send("not found");
  });
}

module.exports = { registerRoutes };
