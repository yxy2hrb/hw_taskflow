/**
 * JS 版 taskflow_gen_latest.py 补丁引擎。
 * 核心流程：
 *   1) 模型输出若干 [OLD]...[NEW]... 替换块；
 *   2) parseBlocks 解析出 (old, new) 列表；
 *   3) findBlockLocation 用精确 / 空白模糊 / 头尾序列三级策略在原 HTML 中定位；
 *   4) applyReplacementsInMemory 按位置从后往前应用；
 *   5) hideAllTempUi + fixDisplayConflicts 做前置清洗。
 */

const { buildHarmonySnapshotBlock, buildHarmonyComponentReferenceBlock } = require("./prompts/harmonySnapshotPrompt");

// ───────── Display 冲突修复 ─────────
const STYLE_ATTR_RE = /style="([^"]*)"/gs;
const DISPLAY_PROP_RE = /display\s*:\s*[^;]+;/gi;

function normalizeDisplayInStyle(styleValue) {
  const displays = styleValue.match(DISPLAY_PROP_RE) || [];
  if (displays.length <= 1) return styleValue;
  const hasNone = displays.some(d => /display\s*:\s*none/i.test(d));
  if (!hasNone) return styleValue;
  const stripped = styleValue.replace(DISPLAY_PROP_RE, "").trim();
  return stripped ? `display: none; ${stripped}` : "display: none;";
}

function fixDisplayConflicts(html) {
  return html.replace(STYLE_ATTR_RE, (_, s) => `style="${normalizeDisplayInStyle(s)}"`);
}

// ───────── 临时任务 UI 隐藏 ─────────
const TEMP_BLOCK_RE = /<!--\s*任务节点开始:\s*(.+?)【临时】\s*-->([\s\S]*?)<!--\s*任务节点结束:\s*\1【临时】\s*-->/g;

/** 把模型自行包在 [NEW] 里的 <div data-temp-hide="1" style="display:none;"> 外壳剥掉。 */
function stripTempHideWrapper(inner) {
  // 处理常见两种写法：display:none; 与 display: none;，引号也兼容单/双
  const re = /^\s*<div\b[^>]*\bdata-temp-hide\s*=\s*["']1["'][^>]*>([\s\S]*?)<\/div>\s*$/i;
  const m = inner.match(re);
  return m ? m[1] : inner;
}

/**
 * 把 HTML 里所有【临时】任务节点块按 keep 名单决定隐藏 / 保留。
 *
 * @param {string} html
 * @param {string|string[]|null} keepTaskNames
 *   - string  → 单个保留 name（向后兼容）
 *   - string[] → 多个保留 name（用于"当前 state + last_state 链"等场景）
 *   - null    → 都隐藏
 */
function hideAllTempUi(html, keepTaskNames = null) {
  const keepList = Array.isArray(keepTaskNames)
    ? keepTaskNames.filter(Boolean).map(s => String(s).trim())
    : (keepTaskNames ? [String(keepTaskNames).trim()] : []);
  return html.replace(TEMP_BLOCK_RE, (full, name, inner) => {
    // 先剥掉模型/历史里可能已经存在的 data-temp-hide 外壳，统一净化
    const purged = stripTempHideWrapper(inner);
    const trimmed = String(name).trim();
    if (keepList.some(k => k && (trimmed === k || trimmed.includes(k)))) {
      // 当前任务 / last_state 链上的临时块：保持显示
      return `<!-- 任务节点开始: ${name}【临时】 -->${purged}<!-- 任务节点结束: ${name}【临时】 -->`;
    }
    const wrapped = `\n<div data-temp-hide="1" style="display: none;">\n${purged}\n</div>\n`;
    return `<!-- 任务节点开始: ${name}【临时】 -->${wrapped}<!-- 任务节点结束: ${name}【临时】 -->`;
  });
}

// ───────── [OLD] / [NEW] 块解析 ─────────
function parseBlocks(text) {
  let t = text
    .replace(/【OLD】\/【NEW】/g, "[OLD]/[NEW]")
    .replace(/【OLD】/g, "[OLD]")
    .replace(/【NEW】/g, "[NEW]")
    .replace(/\[\s*\/\s*old\s*\]/gi, "")
    .replace(/\[\s*\/\s*new\s*\]/gi, "")
    .replace(/<\/\s*old\s*>/gi, "")
    .replace(/<\/\s*new\s*>/gi, "");

  const segments = t.split(/\[\s*old\s*\]/i);
  const blocks = [];
  const newPat = /\[\s*new\s*\]|【\s*new\s*】/i;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const m = seg.match(newPat);
    if (!m) continue;

    let oldRaw = seg.slice(0, m.index).trim();
    let newRaw = seg.slice(m.index + m[0].length).trim();

    const clean = (s) => {
      s = s.replace(/---BLOCK---/g, "").trim();
      s = s.replace(/^```\w*\n?/, "").trim();
      s = s.replace(/\n?```$/, "").trim();
      s = s.replace(/\[\s*\/\s*(old|new)\s*\]/gi, "").trim();
      return s;
    };
    oldRaw = clean(oldRaw);
    newRaw = clean(newRaw);
    // 退化块过滤：OLD 过短（<5 字符）或既无标签也无显著特征，往往是 LLM 把字面 [OLD]/[NEW]
    // 当文档语言用产生的伪块（典型："0 个 [OLD]/[NEW] 块" 会被切出 OLD="/", NEW="块"）。
    // 真实 patch 的 OLD 至少含一个 HTML 标签（<...>），且长度 ≥ 5。
    const looksDegenerate =
      oldRaw.length < 5 || (!/[<>]/.test(oldRaw) && !/[<>]/.test(newRaw));
    if (looksDegenerate) continue;
    blocks.push([oldRaw, newRaw]);
  }
  return blocks;
}

// ───────── 头尾序列定位 ─────────
function isNoiseLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^(<\/div>\s*)+$/i.test(t)) return true;
  if (/^(<\/span>\s*)+$/i.test(t)) return true;
  if (/^(<\/main>\s*)+$/i.test(t)) return true;
  if (/^(<\/section>\s*)+$/i.test(t)) return true;
  if (/^(<\/footer>\s*)+$/i.test(t)) return true;
  if (t === "-->") return true;
  return false;
}

function norm(s) { return s.trim().replace(/\s+/g, " "); }

function pickHeadTailLines(block, headK = 3, tailK = 2) {
  const lines = block.split(/\r?\n/);
  const effective = lines.filter(ln => !isNoiseLine(ln));
  if (effective.length < Math.max(headK, tailK)) return [null, null];
  return [effective.slice(0, headK), effective.slice(-tailK)];
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function escapeFuzzyLine(line) {
  let out = "";
  for (const ch of line) {
    if (/\s/.test(ch)) out += "\\s*";
    else out += escapeRegex(ch);
  }
  return out;
}

function findSequenceInRegion(region, seqLines) {
  let cursor = 0;
  let firstStart = null, lastEnd = null;
  for (const line of seqLines) {
    const pat = new RegExp(escapeFuzzyLine(line), "s");
    const m = region.slice(cursor).match(pat);
    if (!m) return [null, null];
    if (firstStart === null) firstStart = cursor + m.index;
    lastEnd = cursor + m.index + m[0].length;
    cursor = lastEnd;
  }
  return [firstStart, lastEnd];
}

const CLOSE_TOKEN_RE = /<\/\s*(div|span|section|main|footer)\s*>/gi;

function extractTrailingCloseTokens(oldBlock, maxTokens = 200) {
  const tokens = [];
  let s = oldBlock.replace(/\s+$/, "");
  let i = s.length;
  while (i > 0 && tokens.length < maxTokens) {
    let j = i;
    while (j > 0 && /\s/.test(s[j - 1])) j--;
    if (j <= 0) break;
    let last = null;
    CLOSE_TOKEN_RE.lastIndex = 0;
    let mm;
    while ((mm = CLOSE_TOKEN_RE.exec(s.slice(0, j))) !== null) last = mm;
    if (!last || last.index + last[0].length !== j) break;
    tokens.push(s.slice(last.index, last.index + last[0].length));
    i = last.index;
  }
  return tokens.reverse();
}

function consumeMatchingClosingsByOld(original, end0, oldBlock) {
  const oldTokens = extractTrailingCloseTokens(oldBlock);
  if (!oldTokens.length) return end0;
  let p = end0;
  for (const tok of oldTokens) {
    const ws = original.slice(p).match(/^\s*/);
    if (ws) p += ws[0].length;
    if (original.slice(p, p + tok.length).toLowerCase() === tok.toLowerCase()) {
      p += tok.length;
    } else break;
  }
  return p;
}

function extendEndByRealClosings(original, end, maxLookahead = 20000) {
  const tail = original.slice(end, end + maxLookahead);
  const m = tail.match(/^(\s|<\/\s*div\s*>|<\/\s*span\s*>|<\/\s*main\s*>|<\/\s*section\s*>|<\/\s*footer\s*>)+/i);
  return m ? end + m[0].length : end;
}

// ───────── 主定位器 ─────────
function findBlockLocation(original, search, usedPositions) {
  // (A) 精确匹配
  let startSearch = 0;
  while (true) {
    const pos = original.indexOf(search, startSearch);
    if (pos === -1) break;
    if (!usedPositions.has(pos)) return [pos, pos + search.length, original.slice(pos, pos + search.length)];
    startSearch = pos + 1;
  }

  // (A2) 空白模糊匹配
  let parts = [];
  let lastSpace = false;
  for (const ch of search) {
    if (/\s/.test(ch)) {
      if (!lastSpace) { parts.push("\\s+"); lastSpace = true; }
    } else {
      parts.push(escapeRegex(ch));
      lastSpace = false;
    }
  }
  try {
    const wsRe = new RegExp(parts.join(""), "s");
    const m = original.match(wsRe);
    if (m && !usedPositions.has(m.index)) {
      return [m.index, m.index + m[0].length, m[0]];
    }
  } catch { /* regex too big */ }

  // (TAIL-INSERT) body 尾部插入
  const low = search.toLowerCase();
  if (low.includes("</body") || low.includes("<script") || low.includes("</script")) {
    const scripts = Array.from(original.matchAll(/<\s*script\b[^>]*>/gi));
    if (scripts.length) {
      const s0 = scripts[scripts.length - 1].index;
      const bodyMatch = original.slice(s0).match(/<\/\s*body\s*>/i);
      if (bodyMatch) {
        const e1 = s0 + bodyMatch.index + bodyMatch[0].length;
        const real = original.slice(s0, e1);
        if (!usedPositions.has(s0)) return [s0, e1, real];
      }
    }
    return [null, null, null];
  }

  // (B) 头尾序列定位
  const [headLines, tailLines] = pickHeadTailLines(search, 3, 2);
  if (!headLines || !tailLines) return [null, null, null];

  const window = Math.max(search.length * 4, 25000);
  let scanStart = 0;
  const n = original.length;

  while (scanStart < n) {
    const region = original.slice(scanStart);
    const [hFirst, hLast] = findSequenceInRegion(region, headLines);
    if (hFirst === null) break;
    const start = scanStart + hFirst;
    const headEnd = scanStart + hLast;
    if (usedPositions.has(start)) { scanStart = headEnd; continue; }
    const regionEnd = Math.min(n, headEnd + window);
    const region2 = original.slice(headEnd, regionEnd);
    const [, tLast] = findSequenceInRegion(region2, tailLines);
    if (tLast === null) { scanStart = headEnd; continue; }
    const tailEnd = headEnd + tLast;
    const endByOld = consumeMatchingClosingsByOld(original, tailEnd, search);
    const endByReal = extendEndByRealClosings(original, tailEnd);
    const end = Math.max(endByOld, endByReal);
    const real = original.slice(start, end);
    if (!norm(real).includes(norm(headLines[0]))) { scanStart = headEnd; continue; }
    if (!norm(real).includes(norm(tailLines[tailLines.length - 1]))) { scanStart = headEnd; continue; }
    return [start, end, real];
  }
  return [null, null, null];
}

/**
 * 判断 OLD 锚点是否"空" —— 没有业务语义的锚点（空 script/style/head/无内容 div）。
 * 这种锚点会让 LLM 把新增 UI 注入到任意位置，导致全屏浮层与原页面背后内容并存。
 */
function isEmptyAnchor(oldText) {
  if (!oldText) return false;
  const t = String(oldText).trim();
  if (t.length === 0) return true;
  // 注意：<script></script> 不算"空锚点"——patcher 的 TAIL-INSERT 分支会把它重定向到
  // body 末尾的 script→</body> 之间作合法插入点，是 LLM 添加新浮层的常用习惯写法。
  // 只 reject 业务上完全无意义的：空 <head> / 空 <style> / 完全空的 div。
  const m1 = t.match(/^<\s*(style|head)\b[^>]*>([\s\S]*?)<\/\s*\1\s*>$/i);
  if (m1) {
    const inner = m1[2].replace(/<!--[\s\S]*?-->/g, "").trim();
    if (inner.length < 8) return true;
  }
  // 纯空 div（最多 1 层，无文字）—— 但放过"D2C 遮罩 frame"风格的嵌套 div
  // （外层 frame，内嵌带 id/class 的子 div 用于背景填充，子 div 有意义可作 anchor）
  const m2 = t.match(/^<\s*div\b[^>]*>([\s\S]*?)<\/\s*div\s*>$/i);
  if (m2) {
    const innerRaw = m2[1];
    const innerText = innerRaw.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").trim();
    if (innerText.length === 0) {
      // 即使 inner text 为空，只要嵌套的子元素带 id 或 class（如 D2C 框架），就算合法 anchor
      const hasIdentifiableChild = /<[a-z][a-z0-9]*\b[^>]*\b(id|class)\s*=/i.test(innerRaw);
      if (!hasIdentifiableChild) return true;
    }
  }
  return false;
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0, p = 0;
  while ((p = haystack.indexOf(needle, p)) !== -1) { n++; p += needle.length; }
  return n;
}

// ───────── 应用替换 ─────────
function applyReplacementsInMemory(originalHtml, blocks, { log = () => {} } = {}) {
  const replacements = [];
  const used = new Set();
  blocks.forEach(([oldB, newB], i) => {
    // 仅当 NEW 非空（即"插入/替换"）时才校验空锚点；
    // NEW 为空（纯删除）时即便 oldB 是空 div / 空 style 也允许 — 这正是清理 D2C 残留遮罩占位的合法场景。
    if (isEmptyAnchor(oldB) && (newB || "").trim() !== "") {
      log(`❌ Block ${i + 1} OLD 是空锚点(<script>/<style>/空div) 且 NEW 非空 → 拒绝（避免向 body 末尾乱注入）`);
      return;
    }
    // 警告：同一段 OLD 在 base 中出现多次（D2C 多 artboard 展开后常见）
    const occ = countOccurrences(originalHtml, oldB);
    if (occ >= 2) {
      log(`⚠ Block ${i + 1} OLD 在原 HTML 出现 ${occ} 次（D2C 可能含多份相同 frame），仅替换第 1 处；未被替换的副本会造成视觉重叠`);
    }
    const [start, end] = findBlockLocation(originalHtml, oldB, used);
    if (start === null) {
      log(`❌ Block ${i + 1} 未找到 → 跳过`);
      return;
    }
    replacements.push({ start, end, newBlock: newB });
    used.add(start);
  });
  if (!replacements.length) {
    log("⚠️ 无可应用替换块");
    return { html: originalHtml, appliedCount: 0, skippedCount: blocks.length };
  }
  replacements.sort((a, b) => b.start - a.start);
  let out = originalHtml;
  for (const r of replacements) {
    out = out.slice(0, r.start) + r.newBlock + out.slice(r.end);
    log(`✔ 替换 @ ${r.start}`);
  }
  return { html: out, appliedCount: replacements.length, skippedCount: blocks.length - replacements.length };
}

// ───────── 预处理 ─────────
function stripCodeFences(text) {
  if (text == null) return "";
  let s = String(text).trim();
  if (s.startsWith("```")) {
    const lines = s.split("\n").slice(1);
    if (lines.length && lines[lines.length - 1].trim().startsWith("```")) lines.pop();
    s = lines.join("\n").trim();
  }
  return s;
}

/**
 * 把弹窗 top > 200px 的硬约束自动修复（与 Python 版一致的事后守护）。
 *
 * ⚠ 仅作用于"任务节点【临时】/【持久】注释块内"的 inline style，
 *    不要碰原页面 D2C CSS 里的 \`top: 326px\`（那是布局，不是 overlay）。
 * ⚠ 仅修 inline \`style="..."\` 中的 top；CSS 规则块（class.foo { top:326px }）原样保留。
 */
function enforceOverlayTopLimit(html) {
  const blockRe = /(<!--\s*任务节点开始:[^>]+?(?:【临时】|【持久】)\s*-->)([\s\S]*?)(<!--\s*任务节点结束:[^>]+?(?:【临时】|【持久】)\s*-->)/g;
  return html.replace(blockRe, (full, head, body, tail) => {
    const fixed = body.replace(/style\s*=\s*"([^"]*)"/gi, (mStyle, style) => {
      const newStyle = style.replace(/top:\s*(\d{3,5})px/gi, (mTop, n) => {
        const v = parseInt(n, 10);
        return v > 200 ? "top: 40px" : mTop;
      });
      return `style="${newStyle}"`;
    });
    return head + fixed + tail;
  });
}

/**
 * 守护：在每个【临时】/【持久】注释包裹的块内，扫描"看起来是全屏覆盖层"的根 div：
 *   - 含 `position:fixed`
 *   - 且 width/height 撑满 (100% / inset:0 / top:0+left:0+w:100%+h:100%)
 *   - 缺少 `z-index`
 * 给它强制加 \`z-index: 9999\`，避免被原页面的 absolute/sticky 元素遮挡导致鬼影。
 */
function enforceOverlayZIndex(html) {
  const blockRe = /(<!--\s*任务节点开始:[^>]+?(?:【临时】|【持久】)\s*-->)([\s\S]*?)(<!--\s*任务节点结束:[^>]+?(?:【临时】|【持久】)\s*-->)/g;
  return html.replace(blockRe, (full, head, body, tail) => {
    const fixed = body.replace(
      /<div\b([^>]*\bstyle\s*=\s*"([^"]*?)"[^>]*)>/gi,
      (mDiv, attrs, style) => {
        if (!/position\s*:\s*fixed/i.test(style)) return mDiv;
        // 是否撑满视口？
        const isFullScreen =
          /\binset\s*:\s*0\b/i.test(style) ||
          (/\btop\s*:\s*0\b/i.test(style) && /\bleft\s*:\s*0\b/i.test(style) &&
           /\bwidth\s*:\s*100%/i.test(style) && /\bheight\s*:\s*100%/i.test(style));
        if (!isFullScreen) return mDiv;
        if (/\bz-index\s*:/i.test(style)) return mDiv;
        // 注入 z-index: 9999
        const newStyle = style.replace(/\s*$/, "") + (style.trim().endsWith(";") ? "" : ";") + "z-index:9999;";
        return mDiv.replace(/style\s*=\s*"[^"]*"/i, `style="${newStyle}"`);
      }
    );
    return head + fixed + tail;
  });
}

// ───────── 鸿蒙规范（HarmonyOS Design）注入到 patch prompt 的设计契约 ─────
const HARMONY_PATCH_GUIDE = `
==================【HarmonyOS Design 规范（新生成的部分必须遵守）】==================
本任务是在原 HTML 基础上"叠加 / 替换"少量 UI（弹窗、Toast、按钮、徽章等）。
这些**新增片段必须严格符合鸿蒙规范**，与原代码视觉协调（保留原代码不改）。

▸ 色板（仅允许使用以下 token，写成 inline style 的具体色值）
  - 品牌主色 brand           = #0A59F7   （Primary 按钮底、强调文本/图标）
  - 一级警示色 warning       = #E84026   （删除 / 失败 / 危险二次确认）
  - 二级警示色 alert         = #ED6F21   （网络风险、流量提醒类轻警告）
  - 确认色 confirm           = #64BB5C   （Toast 成功 / 已下载状态）
  - 一级文本 fontPrimary     = rgba(0,0,0,0.90)   （正文主色，标题）
  - 二级文本 fontSecondary   = rgba(0,0,0,0.60)   （副文案、说明）
  - 三级文本 fontTertiary    = rgba(0,0,0,0.40)   （辅助 / 占位）
  - 反色文本 fontOnPrimary   = #FFFFFF           （在品牌/警示底色上的文字）
  - 一级背景 bgPrimary       = #FFFFFF           （卡片 / 弹窗底）
  - 二级背景 bgSecondary     = #F1F3F5           （页面/抽屉灰底）
  - 三级控件背景 compBgTertiary = rgba(0,0,0,0.05) （次按钮 / 输入框灰底）
  - 分割线 divider           = rgba(0,0,0,0.10)   （列表 / 弹窗内分隔，禁用纯黑）
  - 遮罩 mask                = rgba(0,0,0,0.40)   （对话框背景遮罩）
  ❌ 严禁出现：渐变 / 纯黑 #000 文字 / 纯白上 #FFFFFF 文字 / 任意非 token 蓝色（#1677FF、#007DFF 等都不合规，统一用 #0A59F7）。

▸ 圆角（务必使用以下数值，禁止 4/6/10 这种不规范值）
  - 卡片 / 弹窗主体     = 16px
  - 普通按钮 / 标签     = 20px（hug height = 40 时，半圆胶囊）
  - 大圆角对话框        = 32px（HmDialog 风格，遮罩居中弹窗）
  - 搜索 / 输入框       = 24px
  - 小徽章 / Tag        = 8px

▸ 字体 & 字号（HarmonyHeiTi 优先）
  - font-family: HarmonyHeiTi, "HarmonyOS Sans", -apple-system, sans-serif
  - 标题 / 弹窗标题: 20px / fontWeight 700 / line-height 1.3
  - 正文 / 按钮: 16px / fontWeight 500 / line-height 1.5
  - 辅助文本 / Toast 内文: 12~14px / fontWeight 400
  ❌ 禁止 serif / cursive / Emoji 字符；图标统一用 Material Icons Round（class="mi"）。

▸ 间距与尺寸
  - 间距使用 4 / 8 / 12 / 16 / 24 / 32 px 倍数；禁止 5 / 9 / 13 这种非规范值；
  - 弹窗左右内边距 24px、顶部 24px、按钮区底部 16px；
  - 按钮高度统一 40px；图标尺寸 20 / 24 px；
  - 移动端整体宽度 ≤ 360px - 32px，弹窗 max-width 328px。

▸ 阴影（不允许厚重阴影 / 黑色阴影）
  - 卡片 / 弹窗     = 0 8px 24px rgba(0,0,0,0.08)
  - Toast / 浮条    = 0 4px 12px rgba(0,0,0,0.06)
  - 普通容器        = 0 1px 6px rgba(0,0,0,0.05)

▸ 组件视觉契约（直接复刻这些做法，不要"原生 HTML"风格）
  - 对话框 Dialog：白底 + 32px 圆角 + 居中遮罩 rgba(0,0,0,0.40)；
       标题 20/700 居中，正文 16/400 居中 fontSecondary，按钮等宽双列，
       次按钮 = compBgTertiary 底 / 品牌色文字；主按钮 = 品牌色底 / 白字。
  - 底部抽屉 Bottom Sheet：白底 + 顶部 16px 圆角 + 顶部一根 36×4 的灰色拖动条
       (rgba(0,0,0,0.20))；自下而上贴底，左右对齐画布两边。
  - Toast：白底 + 6px 圆角 + 阴影 0 4px 12px rgba(0,0,0,0.06)；
       含勾选/警告图标 + 16px 文本 + 可选右侧次按钮（品牌色，文字 + chevron_right）；
       距顶部状态栏下方 16px 居中显示。
  - 进度条：圆角 2px、高 4px、底色 compBgTertiary、填充色品牌色；
       百分比文字置于左上方 12/regular，禁止内嵌于条内。
  - 图标：使用 <span class="mi" style="font-size:20px;color:rgba(0,0,0,0.60)">icon_name</span>
       （Material Icons Round 名），常用映射：下载=download / 警告=warning /
       完成=check_circle / 错误=error / 取消=close / 暂停=pause / 重试=refresh。

▸ 美学红线（避免"未经设计的原生 HTML"既视感）
  - 任何卡片 / 弹窗 / Toast 必须有圆角 + 阴影 + 内边距，三者缺一不可；
  - 按钮文字两端不留空：使用 padding "9px 16px" + 等宽 flex；
  - 文字与图标必须 vertical-align center（用 flex + align-items: center）；
  - 不允许出现裸 <button> / <input> / <hr> 默认外观；
  - 弹窗关闭区域用透明遮罩，不写 "点击空白关闭" 文字提示；
  - 任何"覆盖"位置使用 position:fixed; inset:0; 不沿用设计稿的绝对坐标。
`;

// ───────── 语言检测 ─────────
/**
 * 根据 HTML 中"用户可见文字"判断主语言（不看 inline style / class / id）。
 * 仅区分 zh / en / mixed —— 我们只关心"新生成的文案该用哪种语言"。
 * 返回 { primary, distribution, hint }，hint 是给 prompt 用的中文说明。
 */
function detectLanguage(html) {
  // 抽出 <body> 里"标签外"的文字 + alt/placeholder/title 这类属性。
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const stripped = body
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/style\s*=\s*"[^"]*"/gi, " ")
    .replace(/class\s*=\s*"[^"]*"/gi, " ")
    .replace(/id\s*=\s*"[^"]*"/gi, " ")
    // 保留 alt/placeholder/title 文案（去引号）
    .replace(/(alt|placeholder|title)\s*=\s*"([^"]*)"/gi, " $2 ")
    .replace(/<[^>]+>/g, " ");
  const cn = (stripped.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (stripped.match(/[A-Za-z]{2,}/g) || []).length;
  let primary;
  if (cn === 0 && en > 0) primary = "en";
  else if (cn > 0 && en === 0) primary = "zh";
  else if (cn >= en * 2) primary = "zh";
  else if (en >= cn * 2) primary = "en";
  else primary = "mixed";

  let hint;
  if (primary === "en") {
    hint = `当前页面**主语言是英文（English）**。所有新生成的可见文案（按钮、标题、说明、Toast、空状态文字等）必须用英文，不要用中文。
  示例：用 "Cancel" / "Confirm cancel" / "This action cannot be undone" 而不是 "取消" / "确认取消" / "该操作不可撤销"；
  按钮 "Following" 切换到加载态时用 "Cancelling…" 而不是 "取消中…"；
  失败 Toast 写 "Unfollow failed, please try again" 而不是 "取关失败，请重试"。`;
  } else if (primary === "zh") {
    hint = `当前页面**主语言是中文**。所有新生成的可见文案（按钮、标题、说明、Toast 等）必须用中文，禁止突然出现 English 标签。`;
  } else {
    hint = `当前页面是**中英混排**：保持原页面的混用风格 —— 控件标签 / 系统提示用原页面里使用的那种语言；二级说明文字若原页面以中文为主则用中文，反之用英文。`;
  }
  return { primary, cn, en, hint };
}

// ───────── 核心 Prompt（对齐 Python build_prompt 的关键规则） ─────────
function buildPatchPrompt({ currentReq, html, allRequirements, bodyOnlyMode = false, platformHint = "" }) {
  const allPayload = JSON.stringify(allRequirements || [], null, 2);
  const curPayload = JSON.stringify(currentReq, null, 2);
  const langInfo = detectLanguage(html);

  // ── 解析 last_state 链上的祖先 state_name —— 让 LLM 显式看到"视觉血统父"
  const stateById = new Map();
  for (const s of (allRequirements || [])) {
    if (s && typeof s.state_id === "number") stateById.set(s.state_id, s);
  }
  const lastStateId = currentReq?.last_state;
  const lastStateRec = (lastStateId != null) ? stateById.get(lastStateId) : null;
  const lastStateName = lastStateRec ? (lastStateRec.state_name || `state_${lastStateId}`) : null;
  // 当前 state 在流程列表里的"时间序前一态"（按 state_id 升序）—— 让 LLM 显式区分两者
  const sortedStates = (allRequirements || []).slice().sort((a, b) => (a.state_id || 0) - (b.state_id || 0));
  let timeSeqPrevName = null;
  for (const s of sortedStates) {
    if (s.state_id === currentReq.state_id) break;
    timeSeqPrevName = s.state_name || timeSeqPrevName;
  }
  const isCancelOrResetState = /取消|恢复初始|dismiss|cancel|关闭弹窗|关闭浮层|返回原页/.test(`${currentReq?.state_name || ""} ${currentReq?.description || ""}`);

  // ── 取消/恢复初始态的专门提示
  let cancelHint = "";
  if (isCancelOrResetState) {
    cancelHint = `

==================【取消态 / 恢复初始态 硬约束（重点！）】==================
当前 state 是"取消 / 恢复初始 / 关闭弹窗"类语义，而**【当前 HTML】已经是 last_state（${lastStateName || `state_${lastStateId}`}）的 HTML 快照**——
也就是说，base 已经是"取消之后应该呈现的样子"了，**根本不需要再去删什么**。

✅ 正确做法：直接输出 \`0 个 [OLD]/[NEW] 块\`（即什么都不写），patcher 会把 base 原样作为本 state 的输出。

❌ 严禁这样写：把"流程上一步"（如"${timeSeqPrevName || "上一个被生成的 state"}"）的弹窗/浮层 HTML 复述出来当 [OLD]，
   然后 [NEW] 留空——**这段弹窗根本不在【当前 HTML】里**，patcher 必然报"❌ Block N 未找到 → 跳过"。

❌ 也不要在 body 末尾追加一个"假的关闭动画浮层"——base 已经是关闭后的样子，无需 transition。
`;
  }

  return `
你是一个前端代码重构助手，同时也是一名熟悉 HarmonyOS Design 规范的 UI 设计师。

任务：基于"当前 HTML"和"修改需求"，输出 [OLD]...[NEW]... 替换块。
禁止输出任何自然语言解释。禁止使用 Markdown 代码块标记 (如 \`\`\`html)。

==================【⚠️ 关键 - 当前 HTML 的来源（先读完再写 OLD）】==================
本 state 的 base **不是"流程上时间序的上一个 state"**，而是 \`last_state = ${lastStateId == null ? "null" : lastStateId}\`${lastStateName ? `（即「${lastStateName}」）` : ""} 对应的 HTML 快照。
- "last_state" 是这个 state 的**视觉血统父**——平台会拿它的输出 HTML 当作本次 patch 的 base 喂给你；
- 因此 [OLD] 必须能在【当前 HTML】里**逐字找到**；如果 LLM 凭"流程上的上一步"凭空写一段 OLD（例如复述某个其它分支才出现过的弹窗 HTML），patcher 会报"❌ Block N 未找到 → 跳过"，本 state 等于没改。
- ${timeSeqPrevName && lastStateName && timeSeqPrevName !== lastStateName ? `特别提示：流程时间序的上一个 state 是「${timeSeqPrevName}」，但本 state 的 base 不是它，是「${lastStateName}」。请按 base = ${lastStateName} 来思考。` : "（本 state 的 last_state 与时间序上一态一致，按 base 直接思考即可。）"}
${cancelHint}
${platformHint ? "页面尺寸：" + platformHint + "。" : ""}
${bodyOnlyMode ? "（为节省 token，已只喂给你 <body>...</body> 片段；你的替换块需落在 body 内。）" : ""}

==================【全局静态页面约束】==================
- 只允许生成纯静态页面结构（inline style 可用），不要 JS / click handler；
- 涉及"点击 / 弹窗 / 展开 / 输入"时，直接渲染点击之后的最终静态 DOM 状态；
- 需要输入文字时，写入合理的示例文字，而不是占位符；
- 所有视觉样式**必须用 inline style**；禁止依赖 class / CSS 选择器控制颜色、字号、间距。

==================【语言一致性 - 硬约束】==================
${langInfo.hint}
（自动检测：中文字符 ${langInfo.cn}, 英文词块 ${langInfo.en}, 主语言=${langInfo.primary}）
❌ 不要把"中文页面"中的按钮翻译成英文，也不要在英文页面里突然出现中文文案。

==================【弹窗 / Toast 文案长度 - 硬约束】==================
- 单行文案在 max-width=280px（按钮内）/ 320px（弹窗正文）下要能完整显示，否则**必须换行或缩短**。
- 弹窗正文宽度 ≤ 弹窗内边距后的可用区，绝不能超出弹窗右/下边界。
- 弹窗根容器必须 \`box-sizing:border-box\`，并显式设置 \`max-width:328px\`、\`width:calc(100% - 32px)\`，防止溢出画布。
- 文本元素加 \`word-break:break-word\` 或 \`overflow-wrap:anywhere\`，防止英文长单词撑破容器。
- 中文长正文（>20 字）请保留 \`line-height:1.5\` 并允许换行，不要写成单行不换行（会被截断）。
${buildHarmonySnapshotBlock()}
${buildHarmonyComponentReferenceBlock(currentReq)}
${HARMONY_PATCH_GUIDE}

==================【注释锚点机制（静态任务流核心）】==================
页面里大量中文注释（如 <!-- 顶部状态栏组件：显示时间、网络状态、电量等系统信息 -->）是锚点。
- 禁止删除/修改现有注释；
- 所有和"本次任务"相关的新 UI 必须用注释包裹：
    临时 UI（弹窗/面板/遮罩/展开层/全屏弹窗）：
      <!-- 任务节点开始: ${currentReq.state_name}【临时】 -->
        ...
      <!-- 任务节点结束: ${currentReq.state_name}【临时】 -->
    持久 UI（新增按钮/标签/提示文字，在后续 state 也要保留）：
      <!-- 任务节点开始: ${currentReq.state_name}【持久】 -->
        ...
      <!-- 任务节点结束: ${currentReq.state_name}【持久】 -->
- 弹窗一律【临时】；上一任务的【临时】块已被外层 <div data-temp-hide="1" style="display:none"> 包起来，你不要碰它。
- ❌ **绝对禁止你在 [NEW] 内自行包 \`<div data-temp-hide="1" style="display:none;">\`** —— 这是平台自动添加的隐藏外壳。如果你包了，后续 state 会把你**新生成的内容**也藏起来，截图就什么都看不到。
  你只需要原样输出可见的 UI（弹窗/浮层/按钮）即可，"是否隐藏"由后端在切换 state 时自己处理。

==================【输出格式 - 核心】==================
只允许使用 [OLD] / [NEW] 两类标记，每对代表一个替换块：

  [OLD]
  原始 HTML 中完整拷贝出来的一段（与原文字符、注释、空格一致，禁止改）
  [NEW]
  修改后的新片段

强制规则：
1. **新增(ADD)**：必须使用"锚点扩展法"，[OLD] 放上方已有的一行锚点，[NEW] 复述该锚点 + 新内容。
2. **删除(DELETE)**：[NEW] 留空。
3. **修改(EDIT/WRAP)**：[OLD] 是完整旧片段，[NEW] 是完整新片段。
4. [OLD] 必须来自原 HTML 的逐字片段；不要补全结构，不要新增/省略任何 <div>。
5. 若一个 [OLD] 会超过 50 行或跨度太大，拆成多个小块。
6. 相邻修改点间隔超过 5 行未修改代码时必须拆成两个块。
7. ❌ 绝对禁止输出 [/OLD] / [/NEW]。

==================【弹窗 / 浮层 硬约束】==================
- 所有弹窗/浮层/overlay 只能作为 <body> 的最后一个直接子元素（在末尾 <script> 之前）；
- [OLD] 必须包含现有 <script>...</script> 的完整原文；
- 弹窗根节点：position: fixed; inset: 0; z-index ≥ 9999；
- 弹窗根节点必须有 background: rgba(0,0,0,0.40) 遮罩；内容居中（display:flex; align-items:center; justify-content:center）；
- 禁止出现 top > 200px；禁止沿用设计稿里的大绝对坐标；
- 移动端画布内的弹窗必须使用移动端字号，宽度不得超出画布；
- 对话框正文必须按"标题→正文→按钮组"三段式垂直排版，每段之间至少 12px 间距；
- 按钮必须双列等宽 + 间距 12px，主操作放右侧（鸿蒙规范），次操作放左侧。

==================【任务节点【临时】块改名硬约束（重点！）】==================
当 [OLD] 命中的是一个 \`<!-- 任务节点开始: <旧名>【临时】 -->...<!-- 任务节点结束: <旧名>【临时】 -->\` 块，
而当前 state 是这个临时块的"子状态变化"（例如 编辑页 → 编辑页提交中 / 编辑页错误态 / 编辑页空内容态），
**[NEW] 必须把块名改为当前 state 的名字**，否则后续 state 切换时该块会被自动隐藏。

✅ 正例（编辑页 → 编辑页提交中）：
  [OLD]
  <!-- 任务节点开始: 全屏姓名编辑页【临时】 -->
  <div ...>
    ...
    <button>保存</button>
  </div>
  <!-- 任务节点结束: 全屏姓名编辑页【临时】 -->
  [NEW]
  <!-- 任务节点开始: 编辑页提交中状态【临时】 -->
  <div ...>
    ...
    <button disabled style="opacity:0.6;">保存
      <span style="...spinner..."></span>
    </button>
  </div>
  <!-- 任务节点结束: 编辑页提交中状态【临时】 -->

❌ 反例：
  [NEW] 中保留了 \`<!-- 任务节点开始: 全屏姓名编辑页【临时】 -->\`，
  导致后端识别为"上一态残留"自动 \`display:none\`，整个画面只剩主页（看不到编辑页 + loading）。

==================【任务节点注释 - 强制包裹规则（重点！）】==================
所有**新增的可见 UI**（全屏覆盖页 / 弹窗 / Toast / 遮罩 / 抽屉 / 浮动按钮 / Snackbar / Date Picker
弹窗 等）必须用一对完整的注释包裹，否则后续 state 无法把它隐藏，会出现"两个全屏页同时显示"的鬼影：

  <!-- 任务节点开始: <当前 state_name>【临时】 -->
  <div ...新 UI...>...</div>
  <!-- 任务节点结束: <当前 state_name>【临时】 -->

❗ <当前 state_name> 必须**逐字等于** 当前任务的 state_name（即上方"当前任务节点"小节给出的 state_name 字段值），
   不要自创、不要翻译、不要简化。错的注释名等于没包，下游兜底会自动改名但仍可能漏。

❗ 即使 [OLD] 选的是某个外层容器、[NEW] 整段都在 [OLD] 内部，[NEW] 仍需在自己新增的浮层外面再
   包一对 \`<!-- 任务节点开始/结束: ...【临时】 -->\`。

==================【全屏页切换 硬约束（重点！）】==================
当 description 描述的是**全屏新页面**（如"全屏编辑页"、"详情页"、"设置页"、"新建表单页"），
而当前 HTML 还是"上一态的旧页面骨架"时，[OLD]/[NEW] 必须做"整页覆盖"：

✅ 正确做法 - 推荐写法（"覆盖法"）：
1. [OLD] = 选某个 body 内合适的锚点（如某个 frame 容器开头的注释行），**只占 1~2 行**；
2. [NEW] = 复述 [OLD] 锚点 + 紧跟一个 \`<!-- 任务节点开始: <name>【临时】 -->\` 包裹的**绝对定位全屏覆盖层**：
   \`\`\`
   <div style="position:fixed; inset:0; z-index:9999; background:#FFFFFF; overflow-y:auto; box-sizing:border-box; font-family:HarmonyHeiTi,'HarmonyOS Sans',sans-serif;">
     <!-- 顶部导航栏 -->
     <div style="position:sticky; top:0; height:56px; padding:0 16px; display:flex; align-items:center; gap:12px; background:#FFFFFF; border-bottom:1px solid rgba(0,0,0,0.08); z-index:1;">
       <span class="mi" style="font-size:24px; color:rgba(0,0,0,0.9);">arrow_back</span>
       <span style="flex:1; text-align:center; font-size:18px; font-weight:600; color:rgba(0,0,0,0.9);">编辑姓名</span>
       <span style="width:24px;"></span>
     </div>
     <!-- 内容主体 -->
     <div style="padding:24px 16px; display:flex; flex-direction:column; gap:24px;">
       <div>
         <label style="font-size:14px; color:rgba(0,0,0,0.6); display:block; margin-bottom:8px;">姓名</label>
         <input type="text" value="张三" placeholder="请输入姓名"
           style="width:100%; padding:12px 16px; border:1px solid rgba(0,0,0,0.12); border-radius:8px;
                  font-size:16px; color:rgba(0,0,0,0.9); box-sizing:border-box; outline:none;">
       </div>
     </div>
     <!-- 底部固定保存按钮 -->
     <div style="position:fixed; bottom:0; left:0; right:0; padding:16px; background:#FFFFFF; box-shadow:0 -1px 6px rgba(0,0,0,0.05);">
       <button disabled style="width:100%; padding:12px; background:rgba(0,0,0,0.05); color:rgba(0,0,0,0.4);
         border:none; border-radius:24px; font-size:16px; font-weight:500; cursor:not-allowed;">保存</button>
     </div>
   </div>
   \`\`\`
3. **关键**：覆盖层根节点必须 \`position:fixed; inset:0; z-index:9999; background:#FFFFFF; overflow-y:auto;\`，
   这样原页面所有内容都会被遮住，不需要去精确找"整个主页根容器"作为 [OLD]。

✅ 替代做法 - 整体替换（更彻底，但需要找到正确的根容器）：
- [OLD] 为整个主页 \`<div id="某根" class="某类">…\` 完整拷贝；
- [NEW] 直接是新页面 HTML（不需要 position:fixed）。

❌ 严禁：
- [NEW] 用 \`position:fixed\` 但**不带 z-index**（你的覆盖层会被原页面的 absolute / sticky 元素遮住）；
- [NEW] 只写一个 \`<input>\` 不带容器、不带样式；
- 输入框没有预填值（应当从 description 里抽出原始值，例如"预填'张三'"就要 \`value="张三"\`）；
- 输入框 / 按钮没有真实文字、文案为空；
- 整个新页面紧贴画布顶部 100px 内，下方大段留白；
- [OLD] 选某个零散的字段行（如"姓名行"）做替换 —— 这样原页面其他字段还会显示，造成"半新半旧"的鬼影。

==================【原地状态变化 硬约束（重点！）】==================
当 description / implementation_method 描述的是**原页面已有元素**的状态切换，例如：
  - "原'已关注'按钮变为'取消中…'/'关注'/'已关注'" / "Following → Loading → Follow"
  - "切换 toggle 开 / 关" / "input 显示已输入值" / "复选框 checked"
  - "按钮变灰禁用 / 加 loading" / "点赞数 +1"
  - "Tab 高亮切换" / "底部 nav 当前项变色"
  - 任何形如 "原 X 区域 / 原按钮 / 原文字 → 变为 / 切换为 / 恢复为 …" 的描述
**必须**用 [OLD] 包住"原页面里那个真实元素的完整 HTML 片段"，[NEW] 写改造后的元素。
❌ 严禁：在 <body> 末尾追加一个 position:fixed 浮层"模拟"按钮新状态。
❌ 严禁：保留原元素不动，只在画布之外（如 status bar 区域 top:28px）放浮层覆盖。
✅ 正例：description 说"'Following' 按钮变为'取消中…'"
   [OLD]
   <!-- 已关注按钮：灰色圆角矩形，显示 Following 状态 -->
   <div id="9_462962" class="frame-9_462962">
     <span id="121_24716" class="text-...">Following</span>
   </div>
   [NEW]
   <!-- 已关注按钮：灰色圆角矩形，显示 Following 状态 -->
   <div id="9_462962" class="frame-9_462962" style="opacity:0.6;pointer-events:none;display:flex;gap:4px;align-items:center;">
     <span id="121_24716" class="text-...">取消中…</span>
     <span style="width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.6);animation:spin 1s linear infinite;"></span>
   </div>
仅当 description 是**真正的新增 UI**（如新弹出的 Dialog / Toast / 浮层）时才允许在 body 末尾追加。
如果 description 同时含"原按钮变化 + 弹窗"，必须输出 **2 个 [OLD]/[NEW] 块**，分别处理原按钮和新弹窗。

==================【组件占位标签 - 硬性优先级】==================
[NEW] 块里凡是"清单内有的组件"——Dialog / Button / Toast / TextInput / Search / Switch / Checkbox / Radio /
ProgressBar / Slider / PopupTip / Avatar / IconButton / BottomTab / ChipsTab / SegmentedButton / Card——
**必须用 [HM:Tag attr=value]** 占位标签代替手写 HTML。这些标签会在 patch 应用后被自动替换为真实鸿蒙组件代码。

✦ 标签是自闭合的：[HM:Dialog content="..."] 不需要 [/HM:Dialog]。
✦ Dialog 主体只塞标签，不要在标签里再写 HTML 子节点。Dialog + 双按钮的写法是"Dialog 标签 + 标签外平铺两个 Button"，例如：
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.40); display:flex; align-items:center; justify-content:center; z-index:9999;">
      <div style="display:flex; flex-direction:column; gap:12px; padding:24px; border-radius:32px; background:rgba(255,255,255,0.9); width:280px;">
        [HM:Dialog content="确认下载这首歌吗？"]
        <div style="display:flex; gap:12px;">
          [HM:Button label="取消" variant=secondary]
          [HM:Button label="确认" variant=primary]
        </div>
      </div>
    </div>
✦ 标签外的容器（遮罩、定位、自定义布局）你必须自己用 inline style 写好。
✦ 不在清单内的组件（如自定义复杂卡片）才允许手写 HTML，且仍要遵守上面的色板/圆角/字体规范。

==================【鸿蒙规范执行清单（写完后自检）】==================
- ☑ 优先用 [HM:...] 占位标签；只有清单里没有的 UI 才手写 HTML
- ☑ 所有手写部分色值都来自 token 表，未用 #1677FF / #007DFF / 其它非 token 蓝
- ☑ 所有圆角是 16 / 20 / 24 / 32 / 8 中的一个
- ☑ 字体声明里有 HarmonyHeiTi
- ☑ 卡片/弹窗/Toast 同时具备：圆角、阴影、内边距
- ☑ 图标用 <span class="mi">icon_name</span>，禁止 Emoji

==================【D2C 多 artboard 副本 - 警示（重点！）】==================
Pixso 设计稿如果同时画了"首页 / 长按状态 / 失败状态"等多个 artboard，D2C 导出会把它们
**都展开成同一份 HTML**，于是同一个逻辑卡片（例如"我要办会"）会在原 HTML 中出现 2~3 次，
分布在 \`Pixso-frame-AAA\` / \`Pixso-frame-BBB\` 等不同 id 的容器里。

⚠️ 当 description 描述的是"重写/替换/隐藏 XX 卡片 / 切换为 XX 列表"时：
1. **必须**先在原 HTML 里搜索目标卡片的关键文字（如"我要办会"），找出**所有**出现位置；
2. 如果出现 ≥ 2 次，**必须**为每一份副本各发一个 [OLD]/[NEW] 块；
3. 否则没被处理的副本会原样保留，与新 NEW 内容并排显示，形成"内容重叠 / 双胞胎卡片"鬼影。

✅ 正例（"我要办会"在原 HTML 出现 2 次：分别在 Pixso-frame-146_52765 与 Pixso-frame-146_399586）：
   [OLD] <div id="146_52765" class="Pixso-frame-146_52765">…我要办会卡片整段…</div>
   [NEW] <div id="146_52765" ...>…新会议列表…</div>

   [OLD] <div id="146_399586" class="Pixso-frame-146_399586">…我要办会卡片副本整段…</div>
   [NEW] <div id="146_399586" ... style="display:none">…副本整段（隐藏）…</div>

==================【OLD 完整性 硬约束（重点！）】==================
当 description / implementation_method 包含"卡片展开 / 列表替换 / 卡片切换 / 卡片重写 / 替换 X 区域 / 切换为 / 恢复为"
等"**重写一个区域内容**"语义时（不是"在已有元素上加状态"），[OLD] **必须包含被替换内容的最外层带 id 的 D2C 容器**：

✅ 正例（卡片整段替换）：
  [OLD]
  <div id="146_52765" class="Pixso-frame-146_52765">          ← 父容器整个包进来
    <div id="146_52766" class="Pixso-rectangle-146_52766"></div>
    <div id="146_52767" class="Pixso-frame-146_52767">
      <p>我要办会</p>
    </div>
    ...其余子节点全部包进来...
  </div>
  [NEW]
  <div id="146_52765" class="Pixso-frame-146_52765" style="...">  ← 同 id，整段重写
    ...新列表...
  </div>

❌ 反例（**会出现内容残留与堆叠**）：
  [OLD]
  <div id="146_52767" class="Pixso-frame-146_52767">       ← 只取了某个子节点
    <p>我要办会</p>
  </div>
  [NEW]
  <div ...新列表...>...</div>
  → 父容器 \`146_52765\` 仍保留旧 grid 高度和兄弟节点，新列表与原"待开始"标签重叠出现。

📌 检查点：在写完 [OLD] 之前，反问自己 —— "如果我只删掉 [OLD] 这段，被替换内容还会在吗？" 如果会，那 [OLD] 没包够。

==================【锚点白名单 - 禁用空标签做锚点】==================
[OLD] 锚点必须有"业务语义"，禁止使用以下"空锚点"作为定位：
- \`<script></script>\` / 任意空 \`<script>...</script>\`
- \`<head>...\` / \`<style>...</style>\`
- 空 \`<div></div>\` / 完全没有可视内容的 wrapper

如果你想"在 body 末尾追加新浮层"，请把 [OLD] 设为离插入位置最近的、带 id 的 D2C frame
（例如最后一个 \`<div id="N_NNN" class="Pixso-frame-N_NNN">...</div>\`），[NEW] 复述该 frame
原文 + 紧跟一个 \`<!-- 任务节点开始/结束 -->\` 包裹的浮层。

==================【覆盖即隐藏 - 全屏/卡片覆盖语义】==================
当当前 state 是 "**XX 失败 / 异常 / 加载失败 / 内容覆盖**" 类语义、且 [NEW] 用 \`position:fixed\` 或
\`position:absolute\` 做"覆盖原列表 / 覆盖卡片 / 覆盖工作区"时，**仅画一个 fixed 浮层不够** —— 因为
D2C 设计稿常把多状态的 frame 都展开成 DOM，浮层背后的原元素仍可见。

✅ 必须额外发一个 [OLD]/[NEW] 块，把被覆盖的 D2C frame 加上 \`style="display:none"\`：
  [OLD]
  <div id="146_52765" class="Pixso-frame-146_52765">…我要办会卡片整段…</div>
  [NEW]
  <div id="146_52765" class="Pixso-frame-146_52765" style="display:none">…我要办会卡片整段…</div>

或者，把覆盖层直接 \`position:absolute\` 到要被遮的 frame 内部（重写它的 children）。

❌ 严禁：只在 body 末尾追一层 \`position:fixed; inset:0\` 半透遮罩，背后什么都不隐藏 ——
   截图里你会看到原列表 / 长按菜单 / 老卡片仍透出来，视觉混乱。

==================【重复元素 - 唯一锚点规则】==================
若页面中存在多个相同文字/按钮（如多个 "CONTINUE"），[OLD] 必须带上父容器标题或周边注释，确保唯一定位；
禁止 [OLD] 只写一行通用片段。

==================【状态语义要求】==================
当前任务要渲染的是**点击完成后的静态最终状态**：
- "弹出 Dialog" → 直接把 Dialog 渲染在 DOM 里；
- "切换复选框 checked" → 直接把 checked 状态的那个 UI 画出来；
- "开始下载" → 把进度条/loading 画出来。

==================【loading 状态硬约束（重点！）】==================
当 state_name 或 description 含"加载 / loading / processing / saving / 提交 / 等待 / 中…"等关键词时：
- **必须**在 [NEW] 中显式画一个 loading 视觉（spinner / 圆环动画 / 三点跳动）。
- 推荐写法（之一）：
   <div style="width:48px;height:48px;border:4px solid rgba(0,0,0,0.1);border-top-color:#0050D9;border-radius:50%;animation:hmspin 0.8s linear infinite;margin:auto;"></div>
   <style>@keyframes hmspin{to{transform:rotate(360deg)}}</style>
- 或者：<span class="mi" style="font-size:32px;color:#0050D9;animation:hmspin 1s linear infinite;">progress_activity</span>
- **严禁**只画一层灰色透明遮罩、里面什么都没有——这样用户看不出"正在加载"。
- 哪怕 description 写了"无骨架屏 / 无进度条"，也至少需要一个**居中的 spinner 或脉动文字**，让用户感知到状态。

==================【共享视觉骨架 - 全屏新页面继承规则（重点！）】==================
什么叫"全屏新页面"？description 含"独立全屏页 / 进入 X 页面 / 全新设置页 / 独立 list 页"等，且
implementation_method 提到"position:fixed; inset:0 / 全屏覆盖 / 100% 高度新页面" → 算"全屏新页面"。

这种 state **必须**自带与原页面一致的"系统级骨架"，否则会显得页面被截掉一块：
1) **顶部状态栏（Status Bar）**：原 HTML 顶部含时间 / 信号 / 4G / 电量 100% 那条窄条，
   新页面**必须**在自己的根 div 顶部复用相同结构（直接复制原代码顶部状态栏的 HTML 进来），
   或至少保留 \`padding-top:32px\` 给系统状态栏让位；
2) **顶部导航栏（Nav Bar）**：原 HTML 主页面顶部含"← + 标题 + 右上图标"那条横栏，
   全屏新页面通常需要自己的 nav bar（"← + 新页面标题"），但必须保持**视觉同构**
   （高度、字号、左右内边距、返回箭头位置都要和原页面一致）；
3) **底部 Tab 栏**：除非 description 明确写"沉浸式全屏，无底部 tab"，否则全屏新页面要么把原底部 tab
   留出位置（padding-bottom），要么自己绘制相同的底部 tab；
4) 如果原 HTML 是手机宽度 (\`width:375/393/414\`)，新全屏页面必须遵循相同的画布宽度。

❌ 严禁全屏 \`position:fixed; inset:0\` 直接占满，里面只画"列表+按钮"，让顶部状态栏和导航栏完全消失。
✅ 正例：state_3 是"独立兴趣选择页"
   [NEW]
   <div style="position:fixed; inset:0; z-index:9999; background:#fff; display:flex; flex-direction:column;">
     <!-- ① 复制原页面顶部状态栏（08:08 / 4G / 电量），保持系统骨架不变 -->
     <div class="status-bar" style="height:32px; ...">…原状态栏 HTML…</div>
     <!-- ② 新页面自带的 nav bar（与原 nav bar 视觉同构） -->
     <div class="nav-bar" style="height:48px; padding:0 16px; display:flex; align-items:center;">
       <span class="mi" style="font-size:24px;">arrow_back</span>
       <span style="margin-left:12px; font-size:18px; font-weight:600;">Interests and Preferences</span>
     </div>
     <!-- ③ 真正的页面内容（Tab + 6 张行业卡片） -->
     ...
   </div>

==================【全屏面板/Panel 不透明 - 硬约束（重点！防止 base 透出来）】==================
当 [NEW] 写"全屏 panel / 全屏覆盖页 / 全屏选择面板 / 全屏新页面"（任何 \`position:fixed; inset:0\` 占满整屏的容器）时：

❌ 严禁：根容器 background 用半透明色（\`rgba(0,0,0,0.x)\` / \`rgba(255,255,255,0.x)\` / \`transparent\`）。
   半透明背景会让 base D2C 内容**像素级穿透**到 panel 上——你以为画了 7 张卡片，截图里看到的是
   base 的 3D 模型图标和你的 mi 图标叠在一起的混乱。

✅ 必须：根容器 background **完全不透明**：
   - 浅色主背景：\`#FFFFFF\` 或 \`#F1F3F5\`（HarmonyOS 浅灰）
   - 卡片底色：\`#FFFFFF\` + 0.08 圆角 + 阴影；**不要** \`rgba(0,0,0,0.047)\` 这种几乎透明的"虚化"底色
   - 子图标圆圈底色：\`#F1F3F5\` / \`#EEF4FF\` 等浅色实色；不要 \`rgba(0,0,0,0.0xx)\`

✅ 如果**确实**需要"半透明 modal 遮罩 + 中央卡片"语义（Dialog/Toast/Tooltip 不属于这里，那些遵循另一节）：
   1) 根容器 \`position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;\`
   2) **内部内容**必须放在子 div 里，子 div \`background:#FFFFFF\` 完全不透明。
   3) 这种"小遮罩 + 中央卡"只适用于尺寸较小的弹窗，**不适用于"全屏选择面板/全屏图标列表"等占满整屏的 panel**。

==================【卡片多排列 - Grid 强制（重点！）】==================
当 [NEW] 要渲染 **4 个或更多同类卡片**（行业图标 / 偏好选项 / 应用快捷方式 / 商品瓦片 / 设置项）时：

❌ 严禁：\`display:flex\` + \`overflow-x:auto\` + \`min-width:max-content\` + \`flex:none; width:120px\`
   这是横向滚动，**移动端 360px 一屏只能看 2~3 张**，剩下的全在屏幕右侧被裁掉，肉眼看 = "卡片丢失"。

✅ 必须：CSS Grid 网格：
   - 4 个卡片：\`grid-template-columns: repeat(2, 1fr); gap:16px;\`
   - 6 个卡片：\`grid-template-columns: repeat(3, 1fr); gap:16px;\`
   - 7~9 个卡片：\`grid-template-columns: repeat(3, 1fr); gap:16px;\`（最后一行允许不满）
   - 12 个：\`repeat(3, 1fr)\` 或 \`repeat(4, 1fr)\`
   - 卡片高度自适应内容；不要写死 \`height:144px\`

⚠️ **CSS 语法防错** —— 写完自己数括号：
   - ✅ \`grid-template-columns: repeat(3, 1fr);\`
   - ❌ \`grid-template-columns: repeat(3, minmax(0, 1fr)));\`  ← 多 1 个 \`)\`！整行 CSS 失效！
   - ❌ \`box-shadow: 0 4px 8px rgba(0,0,0,0.1)));\`  ← 多 \`)\`
   - ❌ \`width: calc(100% - 32px));\`  ← 多 \`)\`
   推荐**直接** \`repeat(3, 1fr)\`，**不要**写 \`minmax\` 嵌套，降低出错率。

==================【DOM ID 不冲突 - 硬约束（重点！）】==================
当 [NEW] 复刻"状态栏 / 导航栏 / 底部 tab"等系统骨架时：

❌ 严禁：直接复制原 base 的 id（如 \`id="6_7924"\` / \`id="136_432128"\` / \`id="6_7922"\` 等）。
   - base HTML 里这些 id 仍然存在，复刻后 DOM 出现**两个相同 id**，浏览器渲染、CSS 选择器、JS 行为都会异常；
   - 而且原 D2C 那些 id 大量内联 \`position:absolute; left/top px\` 样式，复用 id 会带回那些定位副作用。

✅ 必须：用本 state 自己的 namespace id，或**直接不写 id**：
   - \`id="hm-st${currentReq?.state_id ?? "x"}-statusbar"\`
   - \`id="hm-st${currentReq?.state_id ?? "x"}-navbar"\`
   - \`id="hm-st${currentReq?.state_id ?? "x"}-tabbar"\`
   - 最简单 = **完全不写 id**，只用 inline style 控制视觉。
   - class 同理：不要复用 \`Pixso-frame-XXX\` / \`Pixso-rectangle-XXX\` 等 D2C class 名（它们也带定位副作用）。

==================【任务流全量上下文】==================
${allPayload}

==================【当前 requirement】==================
${curPayload}

==================【当前 HTML】==================
${html}
`.trim();
}

module.exports = {
  parseBlocks,
  applyReplacementsInMemory,
  findBlockLocation,
  hideAllTempUi,
  fixDisplayConflicts,
  stripCodeFences,
  enforceOverlayTopLimit,
  enforceOverlayZIndex,
  buildPatchPrompt,
  detectLanguage,
};
