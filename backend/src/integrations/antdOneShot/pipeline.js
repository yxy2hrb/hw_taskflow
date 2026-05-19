/**
 * ============================================================
 *  antdOneShot · 主 pipeline
 *
 *  入口：runAntdOneShotPipeline(session, emit, { llmDeps, assetUtils })
 *
 *  流程：
 *    1) prepare：确认/创建 outDir、复制 _hm-assets
 *    2) happy-path：抽 happy path（过滤 cancel/error 分支）
 *    3) baseline：sanitize + 注入 icon 字体
 *    4) llm-call：单次调用，输出 JSON：{ states: [{state_id, edits[], islands{}}] }
 *    5) apply：对每个 state 把 edits 应用到基线 → per-state body snapshot
 *    6) build：interactiveBuilder 打包成一个 interactive.html
 *    7) writes：interactive.html + 调试 artifacts + manifest
 * ============================================================
 */

const path = require("path");
const fs = require("fs/promises");

const { applyReplacementsInMemory, hideAllTempUi, fixDisplayConflicts } = require("../../taskflowPatch");
const { injectIconFontIfNeeded } = require("../hmComponentExpander");
const assetCache = require("../pixsoAssetCache");

const { extractHappyPath } = require("./happyPath");
const { SYSTEM_PROMPT, buildUserPrompt } = require("./prompt");
const { buildInteractiveHtml } = require("./interactiveBuilder");

function timestampTag() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

function sanitizeBaseline(html) {
  return fixDisplayConflicts(hideAllTempUi(html));
}

function extractBody(html) {
  const m = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

/**
 * 给 LLM 喂的"瘦身"版基线：
 *   - 完整保留 <body>...</body>（OLD 锚点要从这里来）
 *   - 抹掉 <head> 里的 <style>...</style> / <script>...</script>（D2C 自带的 CSS 动辄几千行，
 *     对 LLM 选锚点没意义，反而让 token 爆掉 / 超时）
 *   - 保留 <head> 里其它内容（meta / link 等）和 <html> 标签结构，避免破坏整体上下文
 * 真正 apply edits 时仍然用完整 baseHtml（含 style），LLM 给的 OLD 字符串只需要能从 body 里匹配到即可。
 */
function buildLeanBaseForLLM(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style>/* CSS omitted for LLM brevity */</style>")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => {
      // 保留 <script src=...> 引用（无内容的），跳过 inline script
      if (/<script\b[^>]*\bsrc\s*=/i.test(m) && !/[^>]>[\s\S]+<\/script>/.test(m)) return m;
      const srcMatch = m.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*["'][^>]*>/i);
      return srcMatch ? `${srcMatch[0]}</script>` : "";
    });
}

/** 用最宽松的"找到 JSON 对象就解析"策略，兼容 LLM 偶尔输出 markdown 围栏。 */
function tryParseJSONLoose(raw) {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  // 剥掉 ``` / ```json / ```javascript / ```js 等围栏
  const fence = s.match(/^```(?:json|javascript|js)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fence) s = fence[1].trim();
  // 找到第一个 { 和最后一个 }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = s.slice(first, last + 1);
  try { return JSON.parse(candidate); }
  catch (e) {
    // 兜底：去掉行末注释 / 尾逗号再试一次
    const cleaned = candidate
      .replace(/\/\/[^\n]*\n/g, "\n")
      .replace(/,(\s*[}\]])/g, "$1");
    try { return JSON.parse(cleaned); }
    catch { return null; }
  }
}

function validateLLMOutput(parsed, happyPath) {
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "LLM 输出不是对象" };
  if (!Array.isArray(parsed.states)) return { ok: false, reason: "缺少 states 数组" };
  const expectedIds = new Set(happyPath.map(s => s.state_id));
  const seen = new Set();
  for (const st of parsed.states) {
    if (typeof st.state_id !== "number") return { ok: false, reason: "state 缺 state_id" };
    if (!expectedIds.has(st.state_id)) return { ok: false, reason: `state_id ${st.state_id} 不在 happy path` };
    seen.add(st.state_id);
    if (!Array.isArray(st.edits)) return { ok: false, reason: `state ${st.state_id} edits 不是数组` };
    if (st.islands != null && typeof st.islands !== "object") {
      return { ok: false, reason: `state ${st.state_id} islands 不是对象` };
    }
  }
  // 允许 LLM 漏掉部分 state（比如 state_1 不需要改），不强制 seen == expectedIds
  return { ok: true };
}

async function runAntdOneShotPipeline(session, emit, { llmDeps, SAVE_ROOT, withBaseHref }) {
  const { blueprint, seed } = session;
  if (!blueprint) throw new Error("blueprint missing");

  const slug = (blueprint.meta?.slug || "taskflow").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  // ─── 1. outDir ───
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

  emit("prepare", { msg: "[antdOneShot] 预处理 + 抽 happy path", outDir, savedInSource });

  // ─── 2. assets ───
  const assetPrefix = "_hm-assets";
  try {
    const assetTarget = savedInSource && seed.sourceDir
      ? path.join(seed.sourceDir, assetPrefix)
      : path.join(outDir, assetPrefix);
    const cp = await assetCache.copyCacheTo(assetTarget);
    emit("assets", { msg: `[antdOneShot] 鸿蒙资源就位（复制 ${cp.copied}，复用 ${cp.skipped}）`, target: assetTarget });
  } catch (e) {
    emit("assets", { msg: `[antdOneShot] 资源复制失败：${e.message}（继续）` });
  }

  // ─── 3. happy path ───
  const happyPath = extractHappyPath(blueprint.states);
  if (!happyPath.length) throw new Error("无法从蓝图抽取 happy path（states 为空）");
  emit("happy-path", {
    msg: `[antdOneShot] happy path 共 ${happyPath.length} 个 state`,
    states: happyPath.map(s => ({ state_id: s.state_id, state_name: s.state_name })),
  });

  // ─── 4. baseline ───
  const baseline = injectIconFontIfNeeded(
    sanitizeBaseline(seed.html),
    assetPrefix,
    { force: true }
  );
  await fs.writeFile(path.join(outDir, "baseline.html"), baseline, "utf-8");

  // ─── 5. LLM 单调用 ───
  emit("llm-start", { msg: "[antdOneShot] 调用 LLM 单次产出所有 OLD/NEW + JSX islands" });
  // 给 LLM 的是"瘦身"版基线（去掉 D2C 的 <style>），减少 token 占用 / 超时风险。
  // 真正 apply edits 时仍然用完整 baseHtml。
  const leanBase = buildLeanBaseForLLM(baseline);
  emit("llm-prep", { msg: `[antdOneShot] baseline 瘦身: ${baseline.length}B → ${leanBase.length}B` });
  const userPrompt = buildUserPrompt({ baseHtml: leanBase, happyPath });
  await fs.writeFile(path.join(outDir, "oneshot_prompt.txt"),
    `=== SYSTEM ===\n${SYSTEM_PROMPT}\n\n=== USER ===\n${userPrompt}`, "utf-8");
  await fs.writeFile(path.join(outDir, "lean_base.html"), leanBase, "utf-8");

  let rawText = "";
  let parsed = null;
  let validateResult = null;

  // 内部 2 次重试：第一次低温稳定，第二次升温扰动
  const TEMPS = [0.3, 0.7];
  let lastErr = null;
  for (let attempt = 1; attempt <= TEMPS.length; attempt++) {
    const temperature = TEMPS[attempt - 1];
    try {
      // 用 callText 而不是 callJSON：prompt 是结构化指令而不是 system+user 形式，
      // 而且 callJSON 自带的 JSON 模式有些模型会被严格 schema 卡住。我们自己 loose-parse。
      const t0 = Date.now();
      const r = await llmDeps.callText(SYSTEM_PROMPT, userPrompt, { temperature, maxTokens: 4000 });
      const dt = Date.now() - t0;
      if (r == null) throw new Error(`LLM 返回 null（${dt}ms，疑似 timeout 或上游错误，参考 backend stderr）`);
      rawText = typeof r === "string" ? r : JSON.stringify(r);
      emit("llm-raw", { msg: `[antdOneShot] LLM 返回 ${rawText.length}B（attempt ${attempt}, temp=${temperature}, ${dt}ms）` });
      await fs.writeFile(path.join(outDir, `oneshot_raw_attempt${attempt}.txt`), rawText, "utf-8");

      parsed = tryParseJSONLoose(rawText);
      if (!parsed) {
        emit("llm-parse-fail", { msg: `[antdOneShot] JSON 解析失败（attempt ${attempt}），${attempt < TEMPS.length ? "重试" : "放弃"}` });
        continue;
      }
      validateResult = validateLLMOutput(parsed, happyPath);
      if (!validateResult.ok) {
        emit("llm-validate-fail", { msg: `[antdOneShot] 校验失败: ${validateResult.reason}（attempt ${attempt}），${attempt < TEMPS.length ? "重试" : "放弃"}` });
        continue;
      }
      break;
    } catch (e) {
      lastErr = e;
      emit("llm-error", { msg: `[antdOneShot] LLM 异常 (attempt ${attempt}): ${e.message}` });
    }
  }

  if (!parsed || !validateResult?.ok) {
    throw new Error(`[antdOneShot] LLM 多次失败：${lastErr?.message || validateResult?.reason || "未知"}`);
  }

  await fs.writeFile(path.join(outDir, "oneshot_parsed.json"), JSON.stringify(parsed, null, 2), "utf-8");
  emit("llm-ok", { msg: `[antdOneShot] LLM 解析成功，共 ${parsed.states.length} 个 state 改造方案` });

  // ─── 6. apply per state ───
  const stateById = new Map(parsed.states.map(s => [s.state_id, s]));
  const snapshots = {}; // state_id → body inner HTML
  const islandsByState = [];
  const stateApplyMeta = [];

  for (const hp of happyPath) {
    const sid = hp.state_id;
    const def = stateById.get(sid);
    if (!def) {
      // LLM 没产出该 state 的方案 → 用基线 body 顶上
      snapshots[sid] = extractBody(baseline);
      islandsByState.push({ state_id: sid, islands: {} });
      stateApplyMeta.push({ state_id: sid, edits: 0, applied: 0, skipped: 0, fallback: true });
      emit("state-apply", { state_id: sid, msg: "LLM 未提供方案，沿用 baseline" });
      continue;
    }
    const blocks = (def.edits || []).map(e => [String(e.old || ""), String(e.new || "")]).filter(b => b[0]);
    const logs = [];
    const { html: applied, appliedCount, skippedCount } = applyReplacementsInMemory(baseline, blocks, {
      log: (m) => logs.push(m),
    });
    snapshots[sid] = extractBody(applied);
    islandsByState.push({ state_id: sid, islands: def.islands || {} });
    stateApplyMeta.push({ state_id: sid, edits: blocks.length, applied: appliedCount, skipped: skippedCount, fallback: false, logs });
    emit("state-apply", {
      state_id: sid,
      state_name: hp.state_name,
      msg: `applied=${appliedCount}/${blocks.length} islands=${Object.keys(def.islands || {}).length}`,
    });
    // 留一份 per-state HTML 给调试
    await fs.writeFile(
      path.join(outDir, `state_${sid}.html`),
      withBaseHref(applied, savedInSource),
      "utf-8"
    );
  }

  // ─── 7. interactive HTML ───
  const interactiveHtml = buildInteractiveHtml({
    baseHtml: baseline,
    happyPath,
    snapshots,
    islandsByState,
  });
  const interactivePath = path.join(outDir, "interactive.html");
  await fs.writeFile(interactivePath, withBaseHref(interactiveHtml, savedInSource), "utf-8");

  // ─── 8. manifest ───
  const manifest = {
    title: blueprint.meta?.title || "Untitled Taskflow",
    slug,
    pipeline: "antdOneShot",
    createdAt: new Date().toISOString(),
    meta: blueprint.meta,
    happy_path: happyPath.map(s => ({ state_id: s.state_id, state_name: s.state_name })),
    states: happyPath.map(s => ({
      state_id: s.state_id,
      state_name: s.state_name,
      description: s.description,
      implementation_method: s.implementation_method,
      last_state: s.last_state || null,
      file: `state_${s.state_id}.html`,
    })),
    interactive: "interactive.html",
    apply_meta: stateApplyMeta,
  };
  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  session.generation = { slug, outDir, savedInSource, sourceDir: seed.sourceDir || null, manifest, dirName: path.basename(outDir) };
  emit("done", {
    slug,
    outDir,
    savedInSource,
    dirName: path.basename(outDir),
    states: manifest.states,
    interactive: "interactive.html",
    pipeline: "antdOneShot",
  });
  return session.generation;
}

module.exports = { runAntdOneShotPipeline };
