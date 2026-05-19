// ──────────────────────────────────────────────────────────────────────
// twoPhase 主编排器
//
// 流程：
//   skill1 LLM (规划)  →  并行 N × skill2 LLM (执行)
//
// 每个 edit 走 2 条产线之一，由 buildSkill2Prompt 返回的 outputMode 决定：
//   ① inline 模式 (text-edit / delete)：
//      LLM 输出 [OLD][NEW] 块 → parseBlocks → 直接入 allBlocks
//   ② dsl 模式 (state-toggle / new-overlay)：
//      LLM 输出 { "tree": HMNode } JSON → parseDslResponse → compileDslFragment
//      → 自己装配 [OLD][NEW] 块（OLD=anchor，NEW=anchor 或空 + 渲染产物）
//
// 之后两条线汇合到 applyReplacementsInMemory，做字符串级 OLD/NEW 替换。
// 兜底：最后再过一次 expandHmTags（即使 LLM 误用了 [HM:Tag]，也能展开；
//        同时顺手注入 Material Icons 字体）。
// ──────────────────────────────────────────────────────────────────────
"use strict";

const { parseBlocks, applyReplacementsInMemory, stripCodeFences } =
  require("../../taskflowPatch");
const { expandHmTags } = require("../hmComponentExpander");
const { parseDslResponse } = require("../hmDsl/skill");
const {
  compileDslFragment,
  wrapWithTaskComment,
  HMDslError,
} = require("./dslFragment");
const { resolveAnchor, resolveAnchorMulti } = require("./anchorResolver");
const { detectLanguage } = require("./prompts/common");
const { buildSkill1Prompt, parseSkill1Response, scanBaseSkeleton } = require("./prompts/skill1");
const { buildSkill2Prompt } = require("./prompts/skill2");

const SKILL1_RETRY_TEMPS = [0.1, 0.4];
const SKILL2_RETRY_TEMPS = [0, 0.35];
const MAX_ANCHOR_BODY_COVERAGE = 0.75;

// 单次 LLM 调用最长 5 min；避免某次 stream 卡死把整个 state 卡到 SSE 超时
const SINGLE_CALL_TIMEOUT_MS = 5 * 60 * 1000;

// 同一个 state 内并行 skill2 调用上限。当 skill1 规划出 N>3 个 edit 时分波串行，避免
// 一次性向上游 LLM API 发太多并发请求触发 rate limit / 流式连接超时。
const SKILL2_INTERNAL_CONCURRENCY = 2;

function toOneLineText(v) {
  return String(v == null ? "" : v).replace(/\r/g, "").replace(/\n/g, "\\n");
}

function logChunked(log, prefix, text, chunkSize = 1800) {
  const s = String(text == null ? "" : text);
  if (!s) {
    log && log(`${prefix} (empty)`);
    return;
  }
  if (s.length <= chunkSize) {
    log && log(`${prefix} ${toOneLineText(s)}`);
    return;
  }
  const parts = Math.ceil(s.length / chunkSize);
  for (let i = 0; i < parts; i++) {
    const seg = s.slice(i * chunkSize, (i + 1) * chunkSize);
    log && log(`${prefix} [${i + 1}/${parts}] ${toOneLineText(seg)}`);
  }
}

/** Promise.race + setTimeout，给单次 LLM 调用加硬超时 */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} 单次调用超时 ${Math.round(ms / 1000)}s`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** 调 LLM 并自带 2 次重试（temp 扰动）+ 单次硬超时。任一次返回非空字符串即成功。 */
async function callLlmWithRetry({ llmDeps, prompt, temps, log, label }) {
  let last = "";
  let lastErr = "";
  for (let attempt = 1; attempt <= temps.length; attempt++) {
    const t = temps[attempt - 1];
    try {
      const r = await withTimeout(
        llmDeps.callText("", prompt, { temperature: t }),
        SINGLE_CALL_TIMEOUT_MS,
        label,
      );
      if (typeof r === "string" && r.trim()) {
        if (attempt > 1) log && log(`[${label}/retry] 第 ${attempt} 次成功 temp=${t}`);
        return r;
      }
      lastErr = "返回空";
    } catch (e) {
      lastErr = e?.message || String(e);
    }
    log && log(`[${label}/warn] 第 ${attempt} 次 ${lastErr}，${attempt < temps.length ? `重试 temp=${temps[attempt]}…` : "放弃"}`);
    last = "";
  }
  return last;
}

/**
 * 简易 promise pool：把 N 个任务按 concurrency 分波并发执行，保持原顺序结果。
 */
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = [];
  for (let i = 0; i < Math.max(1, Math.min(concurrency, items.length)); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

function isSuccessToastText(text) {
  return /(?:Toast|Snackbar|提示|提示条)/i.test(text || "")
    && /(?:成功|success|created successfully|saved successfully)/i.test(text || "");
}

function normalizeSuccessToastRequirement(req) {
  if (!req || typeof req !== "object") return req;
  const text = `${req.state_name || ""} ${req.description || ""} ${req.implementation_method || ""}`;
  if (!isSuccessToastText(text)) return req;

  const directive = "【twoPhase规范化】成功 Toast/Snackbar 必须是顶部居中悬浮窄条，不是 Banner：width=fit-content，left=50%，transform=translateX(-50%)，background=#64BB5C，border-radius=8px，box-shadow=0 4px 12px rgba(0,0,0,0.06)，padding=10px 16px，无遮罩，不覆盖状态栏和底部 Tab。即使原描述写了全宽/横幅/width:100%，也按此规范执行。";
  return {
    ...req,
    description: `${req.description || ""}\n${directive}`,
    implementation_method: `${req.implementation_method || ""}\n${directive}`,
  };
}

function normalizeSuccessToastEdit(edit, currentReq) {
  if (!edit || typeof edit !== "object") return edit;
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""} ${edit.instruction || ""}`;
  if (!isSuccessToastText(text)) return edit;
  return {
    ...edit,
    instruction: `${edit.instruction || ""}\n\n强制覆盖：这是成功 Toast/Snackbar，不是 Banner。请忽略任何"全宽/横幅/width:100%/left:0"描述，生成顶部居中悬浮窄条：width fit-content，min-width 140px，left 50%，transform translateX(-50%)，background #64BB5C，borderRadius 8，shadow 0 4px 12px rgba(0,0,0,0.06)，padding 10px 16px，gap 8，无遮罩。`,
  };
}

function normalizeSuccessToastTree(tree, edit, currentReq) {
  if (!tree || typeof tree !== "object") return tree;
  const text = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""} ${edit?.instruction || ""}`;
  if (!isSuccessToastText(text)) return tree;

  if (tree.type === "Row") {
    const props = { ...(tree.props || {}) };
    props.background = "#64BB5C";
    props.borderRadius = 8;
    props.padding = [10, 16];
    props.gap = props.gap || 8;
    props.align = "center";
    props.justify = props.justify || "center";
    props.width = "fit-content";
    props.position = "fixed";
    // 32px 状态栏 + 56px NavBar + 8px 间隔 = 96px，避免压住 NavBar 标题
    props.top = props.top || "96px";
    props.left = "50%";
    props.transform = "translateX(-50%)";
    props.zIndex = props.zIndex || 10000;
    props.shadow = props.shadow || "0 4px 12px rgba(0,0,0,0.06)";
    props.style = mergeInlineStyle(props.style, "min-width:140px;");
    delete props.height;
    return { ...tree, props };
  }
  return tree;
}

function mergeInlineStyle(style, addition) {
  const s = typeof style === "string" ? style.trim() : "";
  if (!s) return addition;
  return /;\s*$/.test(s) ? `${s}${addition}` : `${s};${addition}`;
}

// ── 清屏 state（empty / 网络异常 / 全屏错误页）edit 规整器 ───────────
//
// 之前 new_test/5 state_5 出现"新旧页内容重叠"：
//   blueprint 写"全屏空白页 / 暂无项目"，应该把整页换掉，但 LLM 给了
//   type:"new-overlay" 叠层 → 原页内容仍可见 → 与新页混叠。
//
// 这里在 skill1 plan 上做强制规整：
// 命中关键字时，把 type 改为 state-toggle，anchor 强制指向 <body>，
// 这样 patcher 会用编译产物整段替换 body 内容。
const CLEAR_SCREEN_PATTERNS = /(?:全屏空白|全屏错误|empty\s*state|空数据态|无数据态|暂无.*?项目|网络异常|网络连接异常|断网|connection\s*failed|无网络)/i;

function isClearScreenContext(currentReq) {
  if (!currentReq) return false;
  const text = `${currentReq.state_name || ""} ${currentReq.description || ""} ${currentReq.implementation_method || ""}`;
  return CLEAR_SCREEN_PATTERNS.test(text);
}

function normalizeClearScreenEdit(edit, currentReq) {
  if (!edit || typeof edit !== "object") return edit;
  if (!isClearScreenContext(currentReq)) return edit;
  // 仅在 type 不是 state-toggle 时改写
  if (edit.type !== "state-toggle") {
    return {
      ...edit,
      type: "state-toggle",
      anchor: "body",
      instruction: `${edit.instruction || ""}\n\n强制覆盖：这是"清屏 state"（空数据态/网络异常态/错误页），必须用 state-toggle 整体替换 <body> 内容；新画面要自带顶部状态栏、NavBar、底部 Tab（如需），不要 new-overlay 叠层。`,
    };
  }
  return edit;
}

// ── 列表稀疏检测：≥3 个兄弟 Row/ListItem 都缺中间标题文本时，自动补占位 ──
//
// 现象：new_test/6 state_2/3 列表条目只有"图标 + 查看链接"中间空白。
// 原因：skill1 instruction 字面就只写了"左图标+右链接"，LLM 忠实执行。
// 修复：编译前扫一遍 tree，发现"列表 sibling 普遍缺标题文本"时，
//      给每条注入 "标题 1 / 标题 2 ..." 占位 Text，至少不让中间是空白。
const SHORT_ACTION_WORDS = /^(?:查看|删除|编辑|更多|>|\u203A|\u2192|\.\.\.|\u2026|view|edit|delete|more|>|\u203A|\u2192)$/i;

function isLikelyTitleText(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (SHORT_ACTION_WORDS.test(t)) return false;
  return t.length >= 2;
}

function collectTextChildren(node) {
  const out = [];
  if (!node || typeof node !== "object") return out;
  if (node.type === "Text") {
    const s = typeof node.children === "string" ? node.children : "";
    if (s) out.push(s);
  } else if (Array.isArray(node.children)) {
    for (const c of node.children) out.push(...collectTextChildren(c));
  }
  return out;
}

// 统计 tree 中"可见且非占位"的 Text 节点（含 Button.label / NavBar.title 等）
function countVisibleText(node) {
  if (!node || typeof node !== "object") return 0;
  let n = 0;
  // Text 节点
  if (node.type === "Text" && typeof node.children === "string" && node.children.trim()) {
    n++;
  }
  // 常见自带文字 props 的组件
  if (node.type === "Button" || node.type === "NavBar" || node.type === "Banner" ||
      node.type === "ListItem" || node.type === "Badge" || node.type === "Spinner") {
    const p = node.props || {};
    for (const k of ["label", "title", "text", "subtitle", "children"]) {
      if (typeof p[k] === "string" && p[k].trim()) { n++; break; }
    }
  }
  // FormField
  if (node.type === "FormField" || node.type === "TextInput") {
    const p = node.props || {};
    if ((p.label && String(p.label).trim()) || (p.placeholder && String(p.placeholder).trim())) n++;
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) n += countVisibleText(c);
  }
  return n;
}

// ── 修复半残的 </body> / </html> / </div> 闭标签 ─────────────────
// 当 inline OLD 字面值末尾含 `</body>` 等闭标签，fuzzy 匹配 head/tail
// 可能切掉 `<`，留下 `/body>` 纯文本（v25 new_test/4 state_3 底部出现
// "/body>" 的根因）。这里做兜底替换：把游离 `/body>` `/html>` 改回正常
// 闭标签；并保证 finalHtml 末尾有 `</body></html>` 收尾。
function fixDanglingCloseTags(html, log) {
  if (typeof html !== "string" || !html) return html;
  let out = html;
  let fixed = 0;
  // negative lookbehind: `/body>` 前面不是 `<`
  const danglingRe = /(?<!<)\/(body|html|div|span|main|footer)>/g;
  out = out.replace(danglingRe, (m, tag) => {
    fixed++;
    return `</${tag}>`;
  });
  // 保证末尾有 </body></html>
  const lower = out.toLowerCase();
  if (!/<\/html\s*>\s*$/i.test(out.trimEnd())) {
    if (!/<\/body\s*>/i.test(out)) {
      out = out.trimEnd() + "\n</body>\n</html>\n";
      fixed++;
    } else {
      out = out.trimEnd() + "\n</html>\n";
      fixed++;
    }
  } else if (!/<\/body\s*>/i.test(out)) {
    // 有 </html> 但缺 </body>：在 </html> 前插入 </body>
    out = out.replace(/<\/html\s*>/i, "</body>\n</html>");
    fixed++;
  }
  if (fixed > 0 && typeof log === "function") {
    log(`[twoPhase] 修复 ${fixed} 处半残闭标签`);
  }
  return out;
}

// ── F26 (v37)：[NEW] 外包"逃逸 wrapper" ──────────────────────────────
// 当 anchor 在 base 的 absolute / overflow:hidden 容器内时，新内容会被裁。
// 包一层 fixed inset:0 + flex center 的透明 wrapper，让新内容"跳出"原父容器约束。
//
// wrapper 设计原则：
//   - 背景透明 → base 的 status bar + BottomTab + 其他 frame 都能透出
//   - padding 避让骨架：top 60px 给状态栏，bottom 90px 给底导
//   - z-index:1000 → 在 base 内容之上（base 内容默认 z-index:auto）
//   - pointer-events: none on wrapper, auto on inner → 不阻挡 wrapper 外的 base 交互
//   - max-width 90vw + max-height (calc 减去 padding) + overflow-y:auto → 内容多时滚动
function escapeRegExp(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function anchorClassImpliesAbsoluteOrHidden(realAnchor, baseHtml) {
  if (typeof realAnchor !== "string" || typeof baseHtml !== "string") return false;
  const classMatch = realAnchor.match(/\bclass=["']([^"']+)["']/i);
  if (!classMatch) return false;
  const classes = classMatch[1].split(/\s+/).map(s => s.trim()).filter(Boolean);
  for (const cls of classes) {
    const re = new RegExp(`\\.${escapeRegExp(cls)}\\s*\\{([\\s\\S]*?)\\}`, "i");
    const m = baseHtml.match(re);
    if (!m) continue;
    const css = m[1];
    if (/position\s*:\s*absolute/i.test(css) || /overflow\s*:\s*hidden/i.test(css)) {
      return true;
    }
  }
  return false;
}

function needsEscapeWrapper(realAnchor, tree, baseHtml) {
  if (typeof realAnchor !== "string") return false;
  // tree 自己已经是全屏型（Page / FullscreenPanel）→ 编译产物已 fixed inset:0，无需再包
  if (tree && (tree.type === "Page" || tree.type === "FullscreenPanel")) return false;
  // anchor literal 含 absolute 定位或 overflow:hidden（典型 D2C 小子 frame）
  return /position:\s*absolute/i.test(realAnchor)
    || /overflow:\s*hidden/i.test(realAnchor)
    || anchorClassImpliesAbsoluteOrHidden(realAnchor, baseHtml);
}
function wrapInEscapeOverlay(innerHtml, editId) {
  const wrapperId = `hm-escape-${editId || "wrap"}`;
  return [
    `<div id="${wrapperId}" data-hm="EscapeOverlay" style="position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:60px 16px 90px 16px;box-sizing:border-box;pointer-events:none;">`,
    `  <div style="max-width:90vw;max-height:100%;overflow-y:auto;pointer-events:auto;">`,
    innerHtml,
    `  </div>`,
    `</div>`,
  ].join("\n");
}

// 在上一态输出里寻找"任务节点块"作为可替代锚点。
// 用于修复 skill1 选到空容器 id（56B 占位 div）时，state-toggle 无法落块的问题。
function findTaskBlockAnchorByStateName(html, stateName) {
  if (typeof html !== "string" || !html || !stateName) return null;
  const n = escapeRegExp(stateName);
  const re = new RegExp(
    `<!--\\s*任务节点开始:\\s*${n}(?:【持久】|【临时】)\\s*-->[\\s\\S]*?<!--\\s*任务节点结束:\\s*${n}(?:【持久】|【临时】)\\s*-->`,
    "i",
  );
  const m = html.match(re);
  return m ? m[0] : null;
}

function findBestTaskBlockAnchor(html) {
  if (typeof html !== "string" || !html) return null;
  const re = /<!--\s*任务节点开始:[\s\S]*?-->([\s\S]*?)<!--\s*任务节点结束:[\s\S]*?-->/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[0]);
  }
  if (!blocks.length) return null;
  // 优先选最后一个（最近态），再按长度兜底
  const last = blocks[blocks.length - 1];
  if (last && last.length > 300) return last;
  blocks.sort((a, b) => b.length - a.length);
  return blocks[0];
}

function findBestContentFrameAnchorBySkeleton(html) {
  if (typeof html !== "string" || !html) return null;
  const skeleton = scanBaseSkeleton(html);
  const ids = (skeleton && Array.isArray(skeleton.contentFrames) ? skeleton.contentFrames : [])
    .map(f => f && f.id)
    .filter(Boolean);
  let best = null;
  for (const id of ids) {
    try {
      const r = resolveAnchor(html, `#${id}`);
      if (!r || !r.ok || !r.realAnchor) continue;
      const seg = { realAnchor: r.realAnchor };
      if (looksLikeEmptyReplaceTarget(seg)) continue;
      if (!best || r.realAnchor.length > best.length) best = r.realAnchor;
    } catch (_) {}
  }
  return best;
}

// multi-selector 下，LLM 可能把 replace_at 选成空容器（outer 只有几十字节的占位 div）。
// 这种段会被 patcher 的 isEmptyAnchor 拒绝，导致"删除生效但插入失败"→ 中间空白。
// 运行时兜底：若 replace_at 段过小或近似空容器，自动改选同组里最大的非空段。
function looksLikeEmptyReplaceTarget(seg) {
  if (!seg || typeof seg.realAnchor !== "string") return true;
  const s = seg.realAnchor.trim();
  if (s.length < 120) return true;
  // 近似空 div：无可见文本，且无明显可识别子节点
  const innerText = s.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").trim();
  const hasIdentifiableChild = /<[a-z][a-z0-9]*\b[^>]*\b(id|class)\s*=/i.test(s);
  if (innerText.length === 0 && !hasIdentifiableChild && s.length < 320) return true;
  return false;
}

function chooseBestReplaceSegment(resolvedAnchor) {
  if (!resolvedAnchor || resolvedAnchor.mode !== "multi-selector" || !Array.isArray(resolvedAnchor.resolved)) return null;
  const candidates = resolvedAnchor.resolved.filter(seg => !looksLikeEmptyReplaceTarget(seg));
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.realAnchor.length - a.realAnchor.length));
  return candidates[0];
}

// ── F24 (v36 软策略)：检测 blueprint 是否描述为"彻底新页面" ──────────
// 只有命中此意图时，才允许 LLM 用整页 anchor 把 base 骨架一起替换掉。
// 触发关键词（任意匹配即视为新页面）：
//   - "彻底" / "完全" / "整页" / "整张" + 替换/重画/新页
//   - "全新" / "彻底脱离" / "无关 base" + 页面/界面
//   - 启动页 / Splash / Onboarding / Welcome / 引导页
//   - "替换整个页面" / "重新设计页面" / "新增独立页面"
function detectCompletelyNewPageIntent(currentReq) {
  if (!currentReq) return false;
  const text = `${currentReq.state_name || ""} ${currentReq.description || ""} ${currentReq.implementation_method || ""}`;
  if (!text) return false;
  // 显式新页面信号
  if (/启动页|启动屏|splash|onboarding|引导页|欢迎页|welcome\s*page/i.test(text)) return true;
  if (/彻底.{0,4}(替换|重画|重写|更换|新页|换页|脱离)/.test(text)) return true;
  if (/(全新|完全)\s*(独立|无关|脱离|不同|另起)/.test(text)) return true;
  if (/(整页|整张|整个).{0,4}(替换|重画|新页|改版)/.test(text)) return true;
  if (/与.*base.*无关|无关.*base|与原.*无关|与之前.*不同/.test(text)) return true;
  return false;
}

// ── 守门员 C (v38)：detect"小改指令"语义 ──────────────────────────
// 当 instruction 含"仅 / 只 / 保持原样 / 不变 / disabled / loading / 与上一态一致"等小范围变更
// 关键字时，配合下方"anchor 覆盖整个上一态任务块"的检测一起拒绝单 id 大锚 state-toggle。
// 设计：在 base 已经存在 hm-* 子 id 的情况下，必须锚到那些精细 id，禁止偷懒锚到整页 frame。
function detectNarrowChangeIntent(text) {
  if (typeof text !== "string" || !text) return false;
  if (/(仅|只|唯一区别).{0,6}(变|改|更新|替换|加|插入|新增)/.test(text)) return true;
  if (/(其余|其它|其他).{0,6}(保持|不变|原样|一致)/.test(text)) return true;
  if (/(保持原样|保持不变|维持原样|完全一致|结构.*保持|不动)/.test(text)) return true;
  if (/(disabled|loading|提交中|加载中|按钮变灰|按钮置灰)/i.test(text)) return true;
  if (/(与|跟)\s*(上一态|上一个|state_\d+).*(一致|相同|不变)/.test(text)) return true;
  return false;
}

// 判断单 id state-toggle 的 realAnchor 是否"实质包住整个上一态任务块"
// （即锚段内同时含 "任务节点开始" + "任务节点结束" 注释 → 整段全屏页都在 anchor 范围内）。
function anchorWrapsEntireTaskBlock(realAnchor) {
  if (typeof realAnchor !== "string" || !realAnchor) return false;
  return /<!--\s*任务节点开始:/.test(realAnchor) && /<!--\s*任务节点结束:/.test(realAnchor);
}

// ── F19：识别"上一态 DSL 降级 wrapper"锚 ────────────────────────
// DSL 降级路径在 base body 末尾插入 \`<div id="hm-dsl-root-st<N>" style="position:fixed;inset:0;z-index:9999;...">\`
// 作为全屏 overlay 容器。下一态 LLM 若用 state-toggle 替换这个 wrapper，
// 新 tree 不能直接落到原位（变 normal flow 失去 fixed 居中），需要重新包一层 fixed 容器。
function isDslWrapperAnchor(realAnchor) {
  if (typeof realAnchor !== "string") return false;
  // realAnchor 是从 base 提取的 wrapper outerHTML，必含 \`id="hm-dsl-root-st\` 前缀
  return /\bid=["']hm-dsl-root-st\w+["']/.test(realAnchor);
}
function isEscapeWrapperAnchor(realAnchor) {
  if (typeof realAnchor !== "string") return false;
  return /\bid=["']hm-escape-[^"']+["']/.test(realAnchor);
}
function wrapInFixedOverlay(wrappedInnerHtml, stateName, editId) {
  const safeId = `hm-dsl-root-${editId || "st"}-v33`;
  return [
    `<div id="${safeId}" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(0,0,0,0.4);">`,
    wrappedInnerHtml,
    `</div>`,
  ].join("\n");
}

// ── 清理"任务节点结束"注释紧邻其后的 HTML 残骸 ────────────────
// fuzzy 匹配偶尔只切中 OLD 的中段，留下"半截 CSS + 半截闭标签"出现在
// 注释边界后，浏览器渲染成纯文本（v30 new_test/2 state_4 残骸根因）。
// 启发式：`<!-- 任务节点结束: ... -->` 之后紧接的字符若不是 `<` 或空白，
// 则到下一个 `<` 之间都是 OLD 没切干净的残骸，整段删除。
function stripAfterTaskCommentJunk(html, log) {
  if (typeof html !== "string" || !html) return html;
  let stripped = 0;
  // 匹配：注释 + 紧邻的非空白非 `<` 起始的一串字符（直到下一个 `<`）
  const re = /(<!--\s*任务节点结束:[^<\r\n]+?-->)([^<\r\n]{1,400})(?=<)/g;
  const out = html.replace(re, (full, comment, junk) => {
    // 过滤：纯空白 / 换行已被 [^<\r\n] 排除；jung 必非空。
    // 但仍可能误伤"注释后跟正常文本节点"——为保险只匹配 junk 以 `:` `;` `"` `>` `</` 等
    // 半截语法字符开头的情况（明显是被切的属性 / 闭标签残骸）。
    if (/^\s*[:;"]|^\s*\/?>|^\s*[a-z-]+:\s*[#a-z0-9]/i.test(junk)) {
      stripped++;
      return comment;
    }
    return full;
  });
  if (stripped > 0 && typeof log === "function") {
    log(`[twoPhase] 清理 ${stripped} 处"任务节点结束"后的 HTML 残骸`);
  }
  return out;
}

// ── 清理游离的"任务节点开始/结束"注释残骸 ────────────────────────
// 之前 inline 模式下 LLM 偶尔给的 OLD literal 含整段任务注释，但 anchor 文字
// 与 base 中的注释 state_name 略有偏差，patcher 用 fuzzy head-tail 匹配后
// 留下"半残注释"：
//   1) 完整未闭合：base 里残留 `<!-- 任务节点结束: 某【持久】 -->` 但找不到匹配
//      的"开始"注释——HTML 里允许游离闭合注释，不会显示文字，但语义上是脏的；
//   2) `<!--` 被切掉一截：留下 `某【持久】 -->` 直接以纯文本形式渲染在页面里
//      （v24 new_test/4 截图顶部 "屏页空载态【持久】 -->" 的根因）。
// 处理：
//   (a) 修复孤儿"结束注释"——若 `<!-- 任务节点结束: NAME【临|持】 -->`
//       在 finalHtml 里能找到对应的 `<!-- 任务节点开始: NAME...` 但开始注释
//       被前面的 patch 切掉一截，结束注释保留不动；找不到对应开始注释则删除结束注释；
//   (b) 修复"半残文本"——扫 `任务节点结束: NAME【临时|持久】 -->` 这种没有
//       `<!--` 前缀的字符串（即被 patch 切掉了开头），整段删除（含尾部 -->）。
function cleanupOrphanTaskComments(html, log) {
  if (typeof html !== "string" || !html) return html;
  let out = html;
  let stripped = 0;

  // (b) 优先：删掉"半残文本"（没有 <!-- 前缀但有 任务节点开始|结束: ... 【...】 -->）
  // 用 negative lookbehind: 该文本前面紧邻的字符不是 "-"（即没有 <!- 部分注释开始）
  const halfRe = /(?<!<!--\s)(任务节点(?:开始|结束):\s*[^<\r\n]{1,80}(?:【临时】|【持久】)\s*-->)/g;
  out = out.replace(halfRe, (m) => {
    stripped++;
    return "";
  });

  // (a) 删除完全孤儿的"结束注释"（无对应"开始注释"）
  const startNames = new Set();
  const startRe = /<!--\s*任务节点开始:\s*([^<\r\n]+?)(?:【临时】|【持久】)\s*-->/g;
  let sm;
  while ((sm = startRe.exec(out)) !== null) startNames.add(sm[1].trim());
  const endRe = /<!--\s*任务节点结束:\s*([^<\r\n]+?)(?:【临时】|【持久】)\s*-->/g;
  out = out.replace(endRe, (m, name) => {
    if (!startNames.has(name.trim())) { stripped++; return ""; }
    return m;
  });

  // 同样处理孤儿"开始注释"（无对应"结束注释"）
  const endNames = new Set();
  const endRe2 = /<!--\s*任务节点结束:\s*([^<\r\n]+?)(?:【临时】|【持久】)\s*-->/g;
  let em;
  while ((em = endRe2.exec(out)) !== null) endNames.add(em[1].trim());
  const startRe2 = /<!--\s*任务节点开始:\s*([^<\r\n]+?)(?:【临时】|【持久】)\s*-->/g;
  out = out.replace(startRe2, (m, name) => {
    if (!endNames.has(name.trim())) { stripped++; return ""; }
    return m;
  });

  if (stripped > 0 && typeof log === "function") {
    log(`[twoPhase] 清理 ${stripped} 处游离任务节点注释残骸`);
  }
  return out;
}

// stripChromeForInlineEdit 已抽到 ./stripChrome.js（DSL 降级路径也复用）
const { stripChromeFromTree: stripChromeForInlineEdit } = require("./stripChrome");

function injectListTitlePlaceholder(tree) {
  if (!tree || typeof tree !== "object") return tree;
  // 只处理含 ≥3 个同类型 sibling 的容器
  if (Array.isArray(tree.children) && tree.children.length >= 3) {
    const siblings = tree.children;
    const isSiblingRowOrItem = siblings.every(c => c && (c.type === "Row" || c.type === "ListItem"));
    if (isSiblingRowOrItem) {
      const sparseIdx = [];
      siblings.forEach((s, i) => {
        const texts = collectTextChildren(s);
        // 如果该 sibling 没任何"看起来像标题"的文本，认为缺标题
        if (!texts.some(isLikelyTitleText)) sparseIdx.push(i);
      });
      // 至少 3 个稀疏才触发，避免误伤"列表+底部 cta" 的混合容器
      if (sparseIdx.length >= 3 && sparseIdx.length >= Math.floor(siblings.length * 0.6)) {
        sparseIdx.forEach((i, k) => {
          const node = siblings[i];
          const titleNode = {
            type: "Text",
            props: { size: 14, weight: 500, color: "#191919" },
            children: `${k + 1}. 标题`,
          };
          // 插到 children 的中间位置（位置 1，即第一个 child 之后）
          if (!Array.isArray(node.children)) node.children = [];
          // 找第一个 Icon 之后的位置插入
          const iconIdx = node.children.findIndex(c => c && (c.type === "Icon" || c.type === "Spinner"));
          if (iconIdx >= 0) {
            node.children.splice(iconIdx + 1, 0, titleNode);
          } else {
            node.children.unshift(titleNode);
          }
        });
      }
    }
  }
  // 递归
  if (Array.isArray(tree.children)) {
    tree.children = tree.children.map(injectListTitlePlaceholder);
  }
  return tree;
}

// ── Loading button normalizer ────────────────────────────────────────
// 防止 LLM 把"按钮 loading 中"画成 Row + Text + 三圆点（截图里"提交中…"
// 会被嵌套 Row 的默认 width:100% 挤成两行）。
// 统一改回 Button { loading:true, label }，由 Button.js 渲染纯 CSS ring 旋转图标。

const LOADING_PHRASES = /(?:提交中|加载中|确认中|处理中|loading|submitting|spinner|progress_activity|加载点)/i;

function isLoadingContext(currentReq, edit) {
  const reqText = `${currentReq?.state_name || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`;
  const editText = `${edit?.instruction || ""}`;
  return LOADING_PHRASES.test(`${reqText} ${editText}`);
}

function isLoadingButtonContext(edit, currentReq) {
  if (!isLoadingContext(currentReq, edit)) return false;
  // 必须 anchor 是一个按钮容器或按钮本身
  const anchor = typeof edit?.anchor === "string" ? edit.anchor : "";
  return /<button|data-hm="Button"/.test(anchor);
}

function extractLoadingLabel(edit, currentReq) {
  const sources = [
    edit?.instruction || "",
    currentReq?.description || "",
    currentReq?.implementation_method || "",
    currentReq?.state_name || "",
  ];
  for (const s of sources) {
    const m = /(提交中…?|加载中…?|确认中…?|处理中…?|Submitting…?|Loading…?)/i.exec(s);
    if (m) return m[1].endsWith("…") ? m[1] : `${m[1]}…`;
  }
  return "提交中…";
}

function pickPropAnywhere(tree, keys) {
  if (!tree || typeof tree !== "object") return null;
  if (tree.props && typeof tree.props === "object") {
    for (const k of keys) {
      if (tree.props[k] != null) return tree.props[k];
    }
  }
  if (Array.isArray(tree.children)) {
    for (const c of tree.children) {
      const v = pickPropAnywhere(c, keys);
      if (v != null) return v;
    }
  }
  return null;
}

function normalizeLoadingButtonEdit(edit, currentReq) {
  if (!isLoadingButtonContext(edit, currentReq)) return edit;
  return {
    ...edit,
    instruction: `${edit.instruction || ""}\n\n强制覆盖：此 edit 对应"按钮 loading 中"状态。请输出**单个 Button** 节点：\n- type:"Button"\n- props.loading:true\n- props.label/children:"${extractLoadingLabel(edit, currentReq)}"\n- props 保留 width/height/borderRadius/background/color/fontSize 等按钮样式；如未知，用 width:"100%", height:48, borderRadius:9999, background:"#F0F0F0", color:"#191919"\n- 不要再嵌套 Row/Column 拼三个圆点，spinner 由 Button 内置 CSS 旋转环渲染。`,
  };
}

function normalizeLoadingButtonTree(tree, edit, currentReq) {
  if (!isLoadingButtonContext(edit, currentReq)) return tree;
  if (!tree || typeof tree !== "object") return tree;
  // 如果 LLM 已经按要求给 Button + loading，则不动
  if (tree.type === "Button" && tree.props && tree.props.loading === true) {
    return tree;
  }
  const label = extractLoadingLabel(edit, currentReq);
  // 试着从原 tree 里收集样式 hint，否则用默认值
  const bg = pickPropAnywhere(tree, ["background", "bg"]) || "#F0F0F0";
  const color = pickPropAnywhere(tree, ["color", "fg"]) || "#191919";
  const radius = pickPropAnywhere(tree, ["borderRadius", "radius"]) || 9999;
  const width = pickPropAnywhere(tree, ["width"]) || "100%";
  const height = pickPropAnywhere(tree, ["height"]) || 48;
  // 如果原顶层是 fixed 底部条，保留它作为外层 Row，内嵌一个 Button
  if (tree.type === "Row" && tree.props && tree.props.position === "fixed") {
    return {
      type: "Row",
      props: {
        ...tree.props,
        align: "center",
        justify: "center",
        gap: 0,
      },
      children: [{
        type: "Button",
        props: {
          loading: true,
          label,
          width,
          height,
          background: bg,
          color,
          borderRadius: radius,
          disabled: true,
        },
      }],
    };
  }
  // 否则直接整段替换为单个 Button
  return {
    type: "Button",
    props: {
      loading: true,
      label,
      width,
      height,
      background: bg,
      color,
      borderRadius: radius,
      disabled: true,
    },
  };
}

// 对"提交中/加载中"语义做确定性按钮改写：保持原容器结构，只把第一个按钮改为禁用+spinner。
// 这是比"让 LLM 重画整块容器"更稳的高层约束，避免 layout 漂移。
function forceLoadingButtonInHtml(fragmentHtml) {
  if (typeof fragmentHtml !== "string" || !fragmentHtml) return null;
  const m = fragmentHtml.match(/<button\b[^>]*>[\s\S]*?<\/button>/i);
  if (!m) return null;
  const oldBtn = m[0];
  const open = oldBtn.match(/^<button\b([^>]*)>/i);
  const inner = oldBtn.match(/^<button\b[^>]*>([\s\S]*?)<\/button>$/i);
  if (!open || !inner) return null;

  let attrs = open[1] || "";
  // disabled
  if (!/\bdisabled\b/i.test(attrs)) attrs += " disabled";
  // style merge
  const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
  const extraStyle = "background:#CCCCCC;color:#999;cursor:not-allowed;opacity:1;";
  if (styleMatch) {
    const merged = `${styleMatch[1].trim()}${styleMatch[1].trim().endsWith(";") ? "" : ";"}${extraStyle}`;
    attrs = attrs.replace(/\bstyle\s*=\s*"[^"]*"/i, `style="${merged}"`);
  } else {
    attrs += ` style="${extraStyle}"`;
  }

  const spinner = `<span aria-hidden="true" style="display:inline-block;flex-shrink:0;width:16px;height:16px;margin-right:6px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:hmspin 1s linear infinite;vertical-align:middle;box-sizing:border-box;"></span>`;
  const cleanedInner = inner[1].replace(/<span[^>]*hmspin[^>]*>[\s\S]*?<\/span>/i, "").trim();
  const newBtn = `<button${attrs}>${spinner}${cleanedInner}</button>`;
  let out = fragmentHtml.replace(oldBtn, newBtn);
  if (!/@keyframes\s+hmspin/i.test(out)) {
    out += `<style>@keyframes hmspin{to{transform:rotate(360deg)}}</style>`;
  }
  return out;
}

function setFirstButtonStyleAndLabel(fragmentHtml, { bg, color, disabled, label }) {
  if (typeof fragmentHtml !== "string" || !fragmentHtml) return null;
  const m = fragmentHtml.match(/<button\b[^>]*>[\s\S]*?<\/button>/i);
  if (!m) return null;
  const oldBtn = m[0];
  const open = oldBtn.match(/^<button\b([^>]*)>/i);
  if (!open) return null;
  let attrs = open[1] || "";
  if (disabled) {
    if (!/\bdisabled\b/i.test(attrs)) attrs += " disabled";
  } else {
    attrs = attrs.replace(/\sdisabled\b/gi, "");
  }
  const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
  const extraStyle = `background:${bg};color:${color};cursor:${disabled ? "not-allowed" : "pointer"};opacity:1;`;
  if (styleMatch) {
    const merged = `${styleMatch[1].trim()}${styleMatch[1].trim().endsWith(";") ? "" : ";"}${extraStyle}`;
    attrs = attrs.replace(/\bstyle\s*=\s*"[^"]*"/i, `style="${merged}"`);
  } else {
    attrs += ` style="${extraStyle}"`;
  }
  const newBtn = `<button${attrs}>${label}</button>`;
  return fragmentHtml.replace(oldBtn, newBtn);
}

function setConfirmButtonStyleAndLabel(fragmentHtml, { bg, color, disabled, label }) {
  if (typeof fragmentHtml !== "string" || !fragmentHtml) return null;
  const buttonRe = /<button\b[^>]*>[\s\S]*?<\/button>/gi;
  const buttons = [...fragmentHtml.matchAll(buttonRe)];
  if (!buttons.length) return null;
  let target = buttons.find(b => /确认|确认创建/.test(b[0])) || buttons[buttons.length - 1];
  if (!target) return null;
  const oldBtn = target[0];
  const open = oldBtn.match(/^<button\b([^>]*)>/i);
  if (!open) return null;
  let attrs = open[1] || "";
  if (disabled) {
    if (!/\bdisabled\b/i.test(attrs)) attrs += " disabled";
  } else {
    attrs = attrs.replace(/\sdisabled\b/gi, "");
  }
  const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
  const extraStyle = `background:${bg};color:${color};cursor:${disabled ? "not-allowed" : "pointer"};opacity:1;`;
  if (styleMatch) {
    const merged = `${styleMatch[1].trim()}${styleMatch[1].trim().endsWith(";") ? "" : ";"}${extraStyle}`;
    attrs = attrs.replace(/\bstyle\s*=\s*"[^"]*"/i, `style="${merged}"`);
  } else {
    attrs += ` style="${extraStyle}"`;
  }
  const newBtn = `<button${attrs}>${label}</button>`;
  return fragmentHtml.replace(oldBtn, newBtn);
}

function isFilledFormContext(req) {
  const stateName = `${req?.state_name || ""}`;
  const txt = `${req?.description || ""} ${req?.implementation_method || ""} ${req?.instruction || ""}`;
  // 只在 state 名本身明确是"填写/已填"时触发，避免被全局 brief 里的校验/成功语义污染。
  if (!/填写|已填|已选|已添加/i.test(stateName)) return false;
  if (/校验失败|错误提示|不匹配|请输入项目集名称|提交中|加载中|创建成功|toast|snackbar/i.test(stateName)) return false;
  if (/校验失败|错误提示|不匹配|请输入项目集名称/i.test(txt)) return false;
  return true;
}

function isValidationErrorContext(req) {
  const stateName = `${req?.state_name || ""}`;
  const txt = `${req?.description || ""} ${req?.implementation_method || ""} ${req?.instruction || ""}`;
  // 优先看 state 名；其次看错误文案特征。避免把普通"系统校验"流程误判为失败态。
  if (/(校验失败|验证失败|错误提示|失败态|异常态)/i.test(stateName)) return true;
  if (/(不匹配|名称为空|字段错误)/i.test(txt)) return true;
  // "请输入项目集名称" 既可能是 placeholder（正常态），也可能是错误提示（失败态）。
  // 仅当同时出现“错误/提示/下方”等语义词时才判定为失败态。
  if (/请输入项目集名称/i.test(txt) && /(错误|提示|下方|红色)/i.test(txt)) return true;
  return false;
}

function rewriteFilledStateFromBase(oldHtml) {
  if (typeof oldHtml !== "string" || !oldHtml) return null;
  let h = oldHtml;
  h = h.replace(/(<input[^>]*\bvalue=")[^"]*(")/i, `$1AI平台项目集$2`);
  h = h.replace(/(\bplaceholder=")[^"]*(")/i, `$1$2`);
  // 把“添加项目”按钮替换为“已添加项目(1)+一条卡片”
  const cardBlock = [
    `<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">`,
    `  <div style="font-size:14px;color:#191919;font-weight:500;">已添加项目（1）</div>`,
    `  <div style="width:280px;height:64px;border-radius:6px;border:1px solid #E0E0E0;display:flex;align-items:center;padding:0 12px;box-sizing:border-box;gap:8px;">`,
    `    <span class="mi" style="font-size:24px;color:#191919;">folder</span>`,
    `    <span style="font-size:14px;color:#191919;">AI平台-训练模块</span>`,
    `  </div>`,
    `</div>`,
  ].join("");
  h = h.replace(/<button\b[^>]*>[\s\S]*?(?:添加项目|点击添加项目)[\s\S]*?<\/button>/i, cardBlock);
  const fixedBtn = setFirstButtonStyleAndLabel(h, { bg: "#E53935", color: "#FFFFFF", disabled: false, label: "确认" });
  return fixedBtn || h;
}

function rewriteValidationStateFromBase(oldHtml) {
  if (typeof oldHtml !== "string" || !oldHtml) return null;
  let h = oldHtml;
  if (!/请输入项目集名称/.test(h)) {
    h = h.replace(
      /(<input[^>]*>[\s\S]*?<\/div>\s*<\/div>)/i,
      `$1<div style="margin-top:4px;font-size:12px;color:#E53935;">请输入项目集名称</div>`
    );
  }
  if (!/所选项目与归属类型不匹配/.test(h)) {
    h = h.replace(
      /(<button\b[^>]*>[\s\S]*?(?:添加项目|点击添加项目)[\s\S]*?<\/button>)/i,
      `$1<div style="margin-top:8px;font-size:12px;color:#E53935;">所选项目与归属类型不匹配</div>`
    );
  }
  const fixedBtn = setConfirmButtonStyleAndLabel(h, { bg: "#E53935", color: "#FFFFFF", disabled: false, label: "确认" });
  return fixedBtn || h;
}

function isFullScreenFormContext(req) {
  const txt = `${req?.state_name || ""} ${req?.description || ""} ${req?.implementation_method || ""}`;
  return /全屏.*(页|表单)|创建项目集全屏页|Full-?Screen Form/i.test(txt);
}

// 对“全屏新页 + 保留骨架”场景，自动补全 multi-id 锚：
// 如果 skill1 只给了少量内容 id（常见只给 2 个，且漏掉标题/主内容兄弟 frame），
// 会导致旧页面残留。这里统一扩展为"所有内容子 frame"。
function normalizeFullScreenAnchorSet(edit, currentReq, prevHtml, log) {
  if (!edit || edit.type !== "state-toggle") return edit;
  if (!isFullScreenFormContext(currentReq)) return edit;
  const skeleton = scanBaseSkeleton(prevHtml || "");
  const fullIds = (skeleton.contentFrames || [])
    .map(f => f && f.id)
    .filter(id => id && id !== "...");
  if (!fullIds.length) return edit;

  const normalized = fullIds.map(id => `#${id}`);
  const oldArr = Array.isArray(edit.anchor) ? edit.anchor.slice() : [];
  const oldSet = new Set(oldArr);
  const missing = normalized.filter(x => !oldSet.has(x));
  if (missing.length > 0) {
    log && log(`[twoPhase/${edit.id}/anchor] ⚙ 全屏表单态自动补全内容锚点：+${missing.join(", ")}`);
  }
  const replaceAt = (typeof edit.replace_at === "string" && normalized.includes(edit.replace_at))
    ? edit.replace_at
    : normalized.find(x => /14_807630|14_807629/.test(x)) || normalized[0];
  return { ...edit, anchor: normalized, replace_at: replaceAt };
}

function isToastSuccessContext(req) {
  const stateName = `${req?.state_name || ""}`;
  const txt = `${req?.description || ""} ${req?.implementation_method || ""}`;
  return /(创建成功|success|toast|snackbar)/i.test(stateName) || /(创建成功|success|toast|snackbar)/i.test(txt);
}

function detectDimMaskIdsFromCss(html) {
  if (typeof html !== "string" || !html) return [];
  const ids = new Set();
  const re = /\.Pixso-frame-(\d+_\d+)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const css = m[2] || "";
    if (!/background-color\s*:\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.\d+\s*\)/i.test(css)) continue;
    if (!new RegExp(`<[^>]+id=["']${id}["']`, "i").test(html)) continue;
    ids.add(id);
  }
  return [...ids];
}

// 预处理：从 base HTML 里直接剥离 D2C 自带的"半透明空遮罩"占位 div。
// 触发场景：D2C 设计稿在画板中央留了个 360×792 半透明 rgba(0,0,0,0.2x) 的占位 frame
//   （如 #14_807629），实际页面渲染时它会把整页发灰。skill1 即便把它列进 anchor
//   数组也无法删（patcher 的"空锚点拒绝"），最终只能注入 CSS 中和样式。
//   彻底解决：进 skill1 之前就把这种空 mask div 从 base 里删掉，并清掉其 CSS 规则。
function stripPersistentDimMasks(html, log) {
  if (typeof html !== "string" || !html) return html;
  const maskIds = detectDimMaskIdsFromCss(html);
  if (!maskIds.length) return html;
  let out = html;
  const removedIds = [];
  for (const id of maskIds) {
    const emptyDivRe = new RegExp(
      `\\s*<div\\s+id=["']${id}["'][^>]*>\\s*</div>`,
      "i"
    );
    if (emptyDivRe.test(out)) {
      out = out.replace(emptyDivRe, "");
      removedIds.push(id);
    }
  }
  if (removedIds.length && typeof log === "function") {
    log(`[twoPhase/preclean] 剥离 D2C 半透明空遮罩占位 ${removedIds.length} 个：${removedIds.join(",")}`);
  }
  return out;
}

function appendMaskNeutralizeStyle(fragmentHtml, ids) {
  if (typeof fragmentHtml !== "string" || !fragmentHtml) return fragmentHtml;
  const safeIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!safeIds.length) return fragmentHtml;
  const css = safeIds
    .map(id => `#${id}{background:transparent !important;pointer-events:none !important;}`)
    .join("");
  return `${fragmentHtml}<style data-hm-mask-neutralize="1">${css}</style>`;
}

function cleanupStaleIdCssRules(html, log) {
  if (typeof html !== "string" || !html) return html;
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const liveIds = new Set();
  const idAttrRe = /\bid\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = idAttrRe.exec(bodyHtml)) !== null) {
    const id = (m[1] || "").trim();
    if (id) liveIds.add(id);
  }
  if (!liveIds.size) return html;

  const styleBlockRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  let totalRemoved = 0;
  const nextHtml = html.replace(styleBlockRe, (full, attrs = "", cssText = "") => {
    const blocks = cssText.match(/[^{}]+\{[^{}]*\}/g) || [];
    if (!blocks.length) return full;
    const kept = [];
    for (const b of blocks) {
      const open = b.indexOf("{");
      const selectorsPart = open >= 0 ? b.slice(0, open) : "";
      const selectors = selectorsPart.split(",").map(s => s.trim()).filter(Boolean);
      let removeBlock = false;
      for (const sel of selectors) {
        const classMatches = [...sel.matchAll(/\.Pixso-frame-([A-Za-z0-9_-]+)/g)];
        if (!classMatches.length) continue;
        const allGone = classMatches.every(mm => !liveIds.has(mm[1]));
        if (allGone) {
          removeBlock = true;
          break;
        }
      }
      if (removeBlock) {
        totalRemoved += 1;
      } else {
        kept.push(b);
      }
    }
    if (!totalRemoved) return full;
    const rebuilt = kept.join("\n");
    return `<style${attrs ? attrs : ""}>${rebuilt}</style>`;
  });
  if (totalRemoved > 0) log && log(`[twoPhase/css-clean] 清理失效 id 样式规则 ${totalRemoved} 条`);
  return nextHtml;
}

function stripTemporaryTaskOverlaysForFullscreen(html, log) {
  if (typeof html !== "string" || !html) return html;
  let out = html;
  let removedTmpBlocks = 0;
  let removedEscape = 0;

  out = out.replace(
    /<!--\s*任务节点开始:\s*[^<\r\n]+?【临时】\s*-->[\s\S]*?<!--\s*任务节点结束:\s*[^<\r\n]+?【临时】\s*-->/g,
    () => {
      removedTmpBlocks++;
      return "";
    }
  );

  // 清理包裹临时层的 escape wrapper（其内部已被上一步清空）
  out = out.replace(
    /<div id="hm-escape-[^"]+"[^>]*>\s*<div[^>]*>\s*<\/div>\s*<\/div>/g,
    () => {
      removedEscape++;
      return "";
    }
  );

  if ((removedTmpBlocks > 0 || removedEscape > 0) && typeof log === "function") {
    log(`[twoPhase/fullscreen-clean] 清理历史临时层：任务块 ${removedTmpBlocks} 个，escape-wrapper ${removedEscape} 个`);
  }
  return out;
}

function extractNewHtmlFromSkill2(raw) {
  const s = String(raw || "");
  const m = /<!--\s*NEW_HTML_START\s*-->([\s\S]*?)<!--\s*NEW_HTML_END\s*-->/i.exec(s);
  if (m) return (m[1] || "").trim();
  return s.trim();
}

function normalizeFullScreenTopInset(fragmentHtml, log, editId) {
  if (typeof fragmentHtml !== "string" || !fragmentHtml) return fragmentHtml;
  let fixedCount = 0;
  const out = fragmentHtml.replace(/style=(["'])([\s\S]*?)\1/gi, (full, quote, styleText) => {
    const s = String(styleText || "");
    const isFixedOrAbs = /position\s*:\s*(fixed|absolute)/i.test(s);
    if (!isFixedOrAbs) return full;
    // 已经使用 bottom / right 定位的元素是 footer / floating action 类，不应该被改成 top:32px。
    // 仅顶部贴边（top:0 或无 top）的元素需要避让状态栏。
    const hasBottom = /\bbottom\s*:/i.test(s);
    const hasRight = /\bright\s*:/i.test(s) && !/\bright\s*:\s*auto\b/i.test(s);
    if (/top\s*:\s*0(?:px)?\b/i.test(s)) {
      fixedCount++;
      return `style=${quote}${s.replace(/top\s*:\s*0(?:px)?\b/i, "top:32px")}${quote}`;
    }
    // 无 top 时只在不是底部/右侧定位的元素上补 top:32px（避免把底部悬浮按钮顶到顶部）
    if (!/\btop\s*:/i.test(s) && !hasBottom && !hasRight) {
      fixedCount++;
      const merged = `${s.trim()}${s.trim().endsWith(";") ? "" : ";"}top:32px;`;
      return `style=${quote}${merged}${quote}`;
    }
    return full;
  });
  if (fixedCount > 0 && typeof log === "function") {
    log(`[twoPhase/${editId}/html] ⚙ 全屏页顶部避让修正：${fixedCount} 处 fixed/absolute 元素下移到状态栏下方`);
  }
  return out;
}

function looksLikeAbsoluteOrHidden(realAnchor, baseHtml) {
  if (typeof realAnchor !== "string") return false;
  return /position:\s*absolute/i.test(realAnchor)
    || /overflow:\s*hidden/i.test(realAnchor)
    || anchorClassImpliesAbsoluteOrHidden(realAnchor, baseHtml || "");
}

/**
 * twoPhase 主入口。
 *
 * @param {object} args
 * @param {string} args.prevHtml          - 本 state 的 base HTML（由 last_state 决定）
 * @param {object} args.currentReq        - 当前 state requirement
 * @param {Array}  args.allRequirements   - 全 spec 列表
 * @param {Function} args.log             - 日志回调 (msg) => void
 * @param {object} args.llmDeps           - { callText(sys, prompt, opts): Promise<string> }
 * @param {string} [args.assetPrefix]     - 静态资源路径前缀（传给 expandHmTags 写 url(...)）
 *
 * @returns {Promise<{html:string, applied:number, skipped:number, raw:string, twoPhase:object}>}
 */
async function patchOneStateViaTwoPhase({
  prevHtml, currentReq, allRequirements, log = () => {}, llmDeps, assetPrefix,
}) {
  if (!llmDeps || typeof llmDeps.callText !== "function") {
    throw new Error("twoPhase: 缺少 llmDeps.callText");
  }
  if (typeof prevHtml !== "string" || !prevHtml) {
    throw new Error("twoPhase: prevHtml 不能为空");
  }

  // ── 0. 遮罩预清理：从 base 里彻底剥离 D2C 自带的半透明空 mask 占位 ──
  // 这一步在 skill1 之前进行，避免 skill1 把 mask 列进 anchor 数组结果被空锚点拒绝。
  prevHtml = stripPersistentDimMasks(prevHtml, log);

  // ── 1. 语言一次检测，公用 ──────────────────────────────────────────
  const lang = detectLanguage(prevHtml);
  const normalizedReq = normalizeSuccessToastRequirement(currentReq);
  const dimMaskIds = isFullScreenFormContext(normalizedReq) ? detectDimMaskIdsFromCss(prevHtml) : [];
  const normalizedAllRequirements = Array.isArray(allRequirements)
    ? allRequirements.map(r => r?.state_id === currentReq?.state_id ? normalizedReq : normalizeSuccessToastRequirement(r))
    : allRequirements;
  const stateName = (normalizedReq?.state_name || "").trim();
  const stateById = new Map((Array.isArray(allRequirements) ? allRequirements : [])
    .filter(s => s && typeof s.state_id === "number")
    .map(s => [s.state_id, s]));
  const lastStateName = stateById.get(normalizedReq?.last_state)?.state_name || "";
  log(`[twoPhase] 启动 state_${currentReq?.state_id} 「${stateName}」 lang=${lang.primary}`);

  // ── 2. Skill 1：规划 ──────────────────────────────────────────────
  const skill1Prompt = buildSkill1Prompt({
    currentReq: normalizedReq, html: prevHtml, allRequirements: normalizedAllRequirements, languagePrimary: lang.primary,
  });
  log(`[twoPhase] skill1 base=full-html(${(prevHtml.length / 1024).toFixed(1)}KB) prompt ${(skill1Prompt.length / 1024).toFixed(1)}KB`);
  const skill1Raw = await callLlmWithRetry({
    llmDeps, prompt: skill1Prompt, temps: SKILL1_RETRY_TEMPS, log, label: "skill1",
  });
  if (!skill1Raw) {
    throw new Error("twoPhase: skill1 多次返回空");
  }
  let plan;
  try {
    plan = parseSkill1Response(skill1Raw);
  } catch (e) {
    // 给一次 retry 用 temp 0.4 重做
    log(`[twoPhase/warn] skill1 JSON 解析失败：${e.message}，再试一次 temp=0.6`);
    const retry = await callLlmWithRetry({
      llmDeps, prompt: skill1Prompt, temps: [0.6], log, label: "skill1-redo",
    });
    if (!retry) throw new Error("twoPhase: skill1 重试仍返回空");
    plan = parseSkill1Response(retry);
  }

  // ── 3. noop 短路 ─────────────────────────────────────────────────
  if (plan.noop || !plan.edits.length) {
    log(`[twoPhase] skill1 noop=${plan.noop} edits=${plan.edits.length}，沿用 base HTML`);
    return {
      html: prevHtml,
      applied: 0,
      skipped: 0,
      raw: skill1Raw,
      twoPhase: { skill1: plan, skill2: [] },
    };
  }

  log(`[twoPhase] skill1 规划出 ${plan.edits.length} 个 edit：${plan.edits.map(e => `${e.id}(${e.type})`).join(", ")}`);
  plan.edits = plan.edits
    .map(edit => normalizeFullScreenAnchorSet(edit, normalizedReq, prevHtml, log))
    .map(edit => normalizeClearScreenEdit(edit, normalizedReq))
    .map(edit => normalizeSuccessToastEdit(edit, normalizedReq))
    .map(edit => normalizeLoadingButtonEdit(edit, normalizedReq));
  for (const edit of plan.edits) {
    log(`[twoPhase/${edit.id}/plan] type=${edit.type} anchor=${Array.isArray(edit.anchor) ? JSON.stringify(edit.anchor) : String(edit.anchor || "")} replace_at=${edit.replace_at || ""}`);
    logChunked(log, `[twoPhase/${edit.id}/instruction]`, edit.instruction || "");
  }

  // 成功 Toast 场景：只保留 new-overlay，避免额外 state-toggle edit 在严格模式下失败拖垮整 state。
  if (isToastSuccessContext(normalizedReq)) {
    const hadOverlay = plan.edits.some(e => e.type === "new-overlay");
    if (hadOverlay) {
      const before = plan.edits.length;
      plan.edits = plan.edits.filter(e => e.type === "new-overlay");
      const removed = before - plan.edits.length;
      if (removed > 0) log(`[twoPhase/plan] ⚙ success-toast 语义命中：仅保留 new-overlay，移除 ${removed} 个非必要 edit`);
    }
  }
  if (isValidationErrorContext(normalizedReq)) {
    const hasToggle = plan.edits.some(e => e.type === "state-toggle");
    if (hasToggle) {
      const before = plan.edits.length;
      plan.edits = plan.edits.filter(e => e.type === "state-toggle");
      const removed = before - plan.edits.length;
      if (removed > 0) log(`[twoPhase/plan] ⚙ validation-error 语义命中：仅保留 state-toggle，移除 ${removed} 个非必要 overlay edit`);
    }
  }

  // ── 4. Skill 2：限并发执行每个 edit（避免 5+ 并发触发 LLM API rate limit） ──
  const effConc = Math.min(SKILL2_INTERNAL_CONCURRENCY, plan.edits.length);
  if (plan.edits.length > SKILL2_INTERNAL_CONCURRENCY) {
    log(`[twoPhase] skill2 并发限制：${plan.edits.length} 个 edit 分波执行，每波最多 ${SKILL2_INTERNAL_CONCURRENCY}`);
  }
  const skill2Results = await mapWithConcurrency(plan.edits, effConc, async (edit) => {
    const { prompt, outputMode } = buildSkill2Prompt({
      edit, languagePrimary: lang.primary, stateName,
    });

    // ─── anchor 解析（支持单 id "#id" / 多 id 数组 / literal 片段）────
    // 仅 DSL 模式预先解析；inline 模式由 LLM 输出 [OLD]/[NEW] 自带 anchor，patcher 字面匹配
    let resolvedAnchor = null;
    if (outputMode === "dsl" || outputMode === "html") {
      const resolved = resolveAnchorMulti(edit.anchor, prevHtml, edit.replace_at);
      if (!resolved.ok) {
        return {
          edit, raw: "", blocks: [], outputMode,
          error: `anchor 解析失败 (${resolved.mode}): ${resolved.reason}`,
        };
      }
      resolvedAnchor = resolved;
      if (resolved.mode === "multi-selector") {
        const tags = resolved.resolved
          .map(x => `${x.isReplaceAt ? "→" : "✕"}${x.id}(${x.realAnchor.length}B)`)
          .join(", ");
        log(`[twoPhase/${edit.id}/anchor] multi-selector ${resolved.resolved.length} 个 id：${tags}（→ 替换位置，✕ 删除）`);
        for (const seg of resolved.resolved) {
          const tag = seg.isReplaceAt ? "replace_at" : "delete";
          logChunked(log, `[twoPhase/${edit.id}/oldcode/${tag}/#${seg.id}]`, seg.realAnchor || "");
        }
        // F12：dedup 后大覆盖率段警告。> 75% body 通常意味着选了顶层 frame
        // （含 NavBar / 状态栏 / 底导子树），会卷走 base chrome（v27 new_test/4 state_2 事故）。
        // 后续 stripChromeForInlineEdit 兜底，但仍发警告引导下次 LLM 拆细。
        if (resolved.maxBodyCoverage && resolved.maxBodyCoverage > MAX_ANCHOR_BODY_COVERAGE) {
          log(`[twoPhase/${edit.id}/anchor] ⚠ 多 id 锚去重后 "${resolved.largestSegmentId}" 覆盖 body ${(resolved.maxBodyCoverage * 100).toFixed(1)}% > ${(MAX_ANCHOR_BODY_COVERAGE * 100).toFixed(0)}%（疑似顶层 frame，可能卷走 base 的 NavBar / 底导；建议下次把它拆成更细的子 frame 列表）`);
        }
      } else if (resolved.mode === "selector") {
        log(`[twoPhase/${edit.id}/anchor] selector → ${resolved.realAnchor.length}B 整段${resolved.duplicates ? ` (⚠ 同 id 出现 ${resolved.duplicates} 次，仅替换第 1 处)` : ""}`);
        logChunked(log, `[twoPhase/${edit.id}/oldcode]`, resolved.realAnchor || "");
        if (edit.type === "state-toggle" && looksLikeEmptyReplaceTarget({ realAnchor: resolved.realAnchor })) {
          const fallbackBlock = findTaskBlockAnchorByStateName(prevHtml, lastStateName) || findBestTaskBlockAnchor(prevHtml);
          if (fallbackBlock) {
            resolved.realAnchor = fallbackBlock;
            resolved.__fallbackFromTaskBlock = true;
            log(`[twoPhase/${edit.id}/anchor] ⚙ selector 空容器锚点自动纠偏：改用任务节点块作为替换锚点 (${fallbackBlock.length}B)`);
          }
        }
      }
      // ── F9 覆盖率校验：单 id state-toggle 覆盖 > 75% → 警告但不拒绝 ─────
      // 旧策略（v23）是直接 reject，导致 new_test/3 state_3 e1 整段跳过，e2 单独执行后
      //   出现"半截内容 + 错位"残缺布局。
      // 新策略（v26）：保留警告便于排查，**不拒绝**——交由 stripChromeForInlineEdit
      //   把 Page/FullscreenPanel→Column + 移除 StatusBar/NavBar/BottomTab，
      //   即使 LLM 给的是顶层 frame 锚，也只是替换那段位置，不会全屏覆盖 chrome。
      if (edit.type === "state-toggle" && resolved.mode === "selector" && resolved.realAnchor) {
        // ── 守门员 C (v38)：小改指令禁止单 id 大锚 ───────────────────
        // 触发条件三连：
        //   1) edit.type === "state-toggle" 且 mode === "selector"（单 id 锚）
        //   2) instruction 命中"仅/只/保持/原样/不变/disabled/loading"等小改关键字
        //   3) realAnchor 实质包住一整段【任务节点开始...任务节点结束】块（= 上一态全屏页）
        // 命中即拒绝 — 让 LLM 知道：要做小改必须锚到 hm-* 子 id（或 literal text-edit），
        // 不许偷懒选整个任务块然后整页重画。
        if (
          anchorWrapsEntireTaskBlock(resolved.realAnchor) &&
          detectNarrowChangeIntent(`${edit.instruction || ""} ${currentReq?.description || ""} ${currentReq?.implementation_method || ""}`) &&
          !resolved.__fallbackFromTaskBlock
        ) {
          log(`[twoPhase/${edit.id}/anchor] ❌ 守门员 C 拒绝：instruction 描述"小改/保持/仅/不变"，但 anchor "${edit.anchor}" 实质包住整个上一态任务块（${resolved.realAnchor.length}B）。请锚到 hm-* 稳定子 id 做精准小改，或用 literal text-edit。`);
          throw new Error(`anchor "${edit.anchor}" 覆盖整个上一态任务块，与 instruction"小范围变更"语义冲突 — 必须改用 hm-* 子 id 做精准锚（小改场景禁止整页 state-toggle）`);
        }

        const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(prevHtml);
        const bodyLen = bodyMatch ? bodyMatch[1].length : prevHtml.length;
        const cov = resolved.realAnchor.length / Math.max(1, bodyLen);
        // F24 (v36 软策略)：单 id state-toggle 覆盖 body > 75% 默认拒绝，但允许"彻底新页面"例外。
        //   设计原则：
        //     - 默认情况下，base 的状态栏/底导是用户期望保留的骨架 → 拒绝整页 anchor
        //     - 但当 blueprint 明确描述为"彻底新页面"（关键词：彻底替换/全新页面/启动页/
        //       splash/完全脱离 base/与原页面无关）→ 放过，让 LLM 自由重画整页
        //   旧策略（v27 软警告 + v35 自动追加骨架）都不稳：
        //     - 软警告：LLM 不听 → 骨架丢失（v34 翻车）
        //     - 自动追加：新 LLM tree 可能自带骨架 → 重叠（用户反馈）
        if (cov > MAX_ANCHOR_BODY_COVERAGE && !resolved.__fallbackFromTaskBlock) {
          const isCompletelyNewPage = detectCompletelyNewPageIntent(currentReq);
          if (isCompletelyNewPage) {
            log(`[twoPhase/${edit.id}/anchor] ⚠ 单 id 锚 "${edit.anchor}" 覆盖 body ${(cov * 100).toFixed(1)}% > ${(MAX_ANCHOR_BODY_COVERAGE * 100).toFixed(0)}%，但 blueprint 描述为【彻底新页面】，允许整页替换`);
          } else {
            log(`[twoPhase/${edit.id}/anchor] ❌ 单 id 锚 "${edit.anchor}" 覆盖 body ${(cov * 100).toFixed(1)}% > ${(MAX_ANCHOR_BODY_COVERAGE * 100).toFixed(0)}%（整页 frame），blueprint 未明示"彻底新页面"，拒绝此 edit → 让上层回落到 DSL 路径`);
            throw new Error(`anchor "${edit.anchor}" 覆盖 body ${(cov * 100).toFixed(1)}% > ${(MAX_ANCHOR_BODY_COVERAGE * 100).toFixed(0)}%（整页 frame，必须改用多 id 锚精准列出要改的内容子 frame；除非 blueprint 明确说"彻底新页面"）`);
          }
        }
      }
    }

    const raw = await callLlmWithRetry({
      llmDeps, prompt, temps: SKILL2_RETRY_TEMPS, log, label: `skill2/${edit.id}`,
    });
    if (!raw) return { edit, raw: "", blocks: [], error: "LLM 返回空", outputMode };

    // 继承态确定性小改：仅在"空锚点纠偏到任务块"场景使用，避免干扰 full-screen 主内容重建。
    if (outputMode === "dsl" && edit.type === "state-toggle" && resolvedAnchor) {
      // 确定性小改前也要做空锚点纠偏，否则会拿 56B 空容器去 patch 导致 applied=0
      if (resolvedAnchor.mode === "selector" && looksLikeEmptyReplaceTarget({ realAnchor: resolvedAnchor.realAnchor })) {
        const fb = findTaskBlockAnchorByStateName(prevHtml, lastStateName)
          || findBestTaskBlockAnchor(prevHtml)
          || findBestContentFrameAnchorBySkeleton(prevHtml);
        if (fb) {
          resolvedAnchor.realAnchor = fb;
          resolvedAnchor.__fallbackFromTaskBlock = true;
          log(`[twoPhase/${edit.id}/anchor] ⚙ 确定性小改前空锚点纠偏：改用任务节点块 (${fb.length}B)`);
        }
      }
      if (resolvedAnchor.mode === "multi-selector") {
        const replaceSeg = resolvedAnchor.resolved.find(seg => seg.isReplaceAt);
        if (replaceSeg && looksLikeEmptyReplaceTarget(replaceSeg)) {
          const best = chooseBestReplaceSegment(resolvedAnchor);
          if (best) {
            for (const seg of resolvedAnchor.resolved) seg.isReplaceAt = (seg.id === best.id);
            log(`[twoPhase/${edit.id}/anchor] ⚙ 确定性小改前 replace_at 纠偏：#${replaceSeg.id} -> #${best.id}`);
          }
        }
      }

      const shouldDeterministicRewrite =
        resolvedAnchor.mode === "selector" && resolvedAnchor.__fallbackFromTaskBlock === true;
      const buildDeterministicBlocks = (newHtml, isMulti = false) => {
        if (!newHtml) return null;
        if (!isMulti) return [[resolvedAnchor.realAnchor, newHtml]];
        return resolvedAnchor.resolved.map(seg => seg.isReplaceAt ? [seg.realAnchor, newHtml] : [seg.realAnchor, ""]);
      };
      // 优先级：校验失败 > 填写中（避免 state 名称同时含"已填"与"失败"时误判）
      if (shouldDeterministicRewrite && isValidationErrorContext(normalizedReq)) {
        const oldSeg = resolvedAnchor.mode === "multi-selector"
          ? (resolvedAnchor.resolved.find(seg => seg.isReplaceAt)?.realAnchor || "")
          : resolvedAnchor.realAnchor;
        const det = rewriteValidationStateFromBase(oldSeg);
        const blocks = buildDeterministicBlocks(det, resolvedAnchor.mode === "multi-selector");
        if (blocks) {
          log(`[twoPhase/${edit.id}/anchor] ⚙ 校验失败态命中：使用确定性小改（继承上一态结构）`);
          return { edit, raw, blocks, outputMode };
        }
      }
      if (shouldDeterministicRewrite && isFilledFormContext(normalizedReq)) {
        const oldSeg = resolvedAnchor.mode === "multi-selector"
          ? (resolvedAnchor.resolved.find(seg => seg.isReplaceAt)?.realAnchor || "")
          : resolvedAnchor.realAnchor;
        const det = rewriteFilledStateFromBase(oldSeg);
        const blocks = buildDeterministicBlocks(det, resolvedAnchor.mode === "multi-selector");
        if (blocks) {
          log(`[twoPhase/${edit.id}/anchor] ⚙ 填写中态命中：使用确定性小改（继承上一态结构）`);
          return { edit, raw, blocks, outputMode };
        }
      }
    }

    // Loading 提交态确定性改写：优先从 anchor 原片段直接改按钮，避免 LLM 改坏整个表单结构。
    if (outputMode === "dsl" && edit.type === "state-toggle" && isLoadingContext(normalizedReq, edit) && resolvedAnchor) {
      const makeBlocksForLoading = (oldSeg, isMulti = false) => {
        const forced = forceLoadingButtonInHtml(oldSeg);
        if (!forced) return null;
        if (!isMulti) return [[oldSeg, forced]];
        return resolvedAnchor.resolved.map(seg => seg.isReplaceAt ? [seg.realAnchor, forced] : [seg.realAnchor, ""]);
      };
      if (resolvedAnchor.mode === "selector") {
        const blocks = makeBlocksForLoading(resolvedAnchor.realAnchor, false);
        if (blocks) {
          log(`[twoPhase/${edit.id}/anchor] ⚙ loading 语义命中：改为原位按钮确定性改写（不重画整块布局）`);
          return { edit, raw, blocks, outputMode };
        }
      } else if (resolvedAnchor.mode === "multi-selector") {
        const replaceSeg = resolvedAnchor.resolved.find(seg => seg.isReplaceAt);
        if (replaceSeg) {
          const blocks = makeBlocksForLoading(replaceSeg.realAnchor, true);
          if (blocks) {
            log(`[twoPhase/${edit.id}/anchor] ⚙ loading 语义命中：multi-selector 原位改写 replace_at 按钮，其他段按原计划删除`);
            return { edit, raw, blocks, outputMode };
          }
        }
      }
    }

    // ─── 直接 HTML 模式（state-toggle / new-overlay）────────────────
    if (outputMode === "html") {
      let newHtml = extractNewHtmlFromSkill2(raw);
      if (!newHtml) {
        return { edit, raw, blocks: [], error: "HTML 输出为空", outputMode };
      }
      const shouldPreserveChromeFullscreen = edit.type === "state-toggle"
        && isFullScreenFormContext(normalizedReq)
        && !detectCompletelyNewPageIntent(normalizedReq);
      if (shouldPreserveChromeFullscreen) {
        newHtml = normalizeFullScreenTopInset(newHtml, log, edit.id);
      }
      const stateNameLocal = (normalizedReq?.state_name || "").trim();
      const wrapTag = edit.type === "new-overlay" ? "【临时】" : "【持久】";
      const wrapped = wrapWithTaskComment(newHtml, stateNameLocal, wrapTag);
      let blocks;
      if (edit.type === "new-overlay") {
        const overlayHtml = wrapInEscapeOverlay(wrapped, edit.id);
        blocks = [["</body>", `${overlayHtml}\n</body>`]];
      } else if (resolvedAnchor.mode === "multi-selector") {
        // 全屏页（保留状态栏/底导）优先替换"上一态任务块"：
        // 避免 skill1 给出过窄多锚点导致旧主内容（如“我的工作台”）残留。
        if (shouldPreserveChromeFullscreen) {
          const taskBlock = findTaskBlockAnchorByStateName(prevHtml, lastStateName) || findBestTaskBlockAnchor(prevHtml);
          if (taskBlock && taskBlock.length > 500) {
            let taskNewContent = wrapped;
            if (dimMaskIds.length) {
              taskNewContent = appendMaskNeutralizeStyle(taskNewContent, dimMaskIds);
              log(`[twoPhase/${edit.id}/anchor] ⚙ 全屏页任务块替换：注入暗色遮罩中和样式 ${dimMaskIds.join(",")}`);
            }
            log(`[twoPhase/${edit.id}/anchor] ⚙ 全屏页保骨架：multi-selector -> 任务块整段替换 (${taskBlock.length}B)，清理旧主内容残留`);
            blocks = [[taskBlock, taskNewContent]];
            log(`[twoPhase/${edit.id}/html] new ${newHtml.length}B blocks=${blocks.length}`);
            return { edit, raw, blocks, outputMode };
          }
        }
        const currentReplace = resolvedAnchor.resolved.find(seg => seg.isReplaceAt);
        if (currentReplace && looksLikeEmptyReplaceTarget(currentReplace)) {
          const best = chooseBestReplaceSegment(resolvedAnchor);
          if (best && best.id !== currentReplace.id) {
            for (const seg of resolvedAnchor.resolved) seg.isReplaceAt = (seg.id === best.id);
            log(`[twoPhase/${edit.id}/anchor] ⚙ replace_at 自动纠偏：原 replace_at=#${currentReplace.id} (${currentReplace.realAnchor.length}B, 空容器风险) → #${best.id} (${best.realAnchor.length}B)`);
          }
        }
        const anyAbsolute = resolvedAnchor.resolved.some(seg => looksLikeAbsoluteOrHidden(seg.realAnchor));
        let newContent = anyAbsolute ? wrapInEscapeOverlay(wrapped, edit.id) : wrapped;
        if (dimMaskIds.length) {
          newContent = appendMaskNeutralizeStyle(newContent, dimMaskIds);
          log(`[twoPhase/${edit.id}/anchor] ⚙ 检测到历史暗色遮罩 frame(${dimMaskIds.join(",")})，注入背景中和样式避免发灰`);
        }
        blocks = resolvedAnchor.resolved.map(seg => seg.isReplaceAt ? [seg.realAnchor, newContent] : [seg.realAnchor, ""]);
      } else {
        let wrappedFinal = wrapped;
        if (isEscapeWrapperAnchor(resolvedAnchor.realAnchor) || looksLikeAbsoluteOrHidden(resolvedAnchor.realAnchor)) {
          wrappedFinal = wrapInEscapeOverlay(wrappedFinal, edit.id);
        }
        if (dimMaskIds.length) {
          wrappedFinal = appendMaskNeutralizeStyle(wrappedFinal, dimMaskIds);
          log(`[twoPhase/${edit.id}/anchor] ⚙ 注入暗色遮罩中和样式：${dimMaskIds.join(",")}`);
        }
        blocks = [[resolvedAnchor.realAnchor, wrappedFinal]];
      }
      log(`[twoPhase/${edit.id}/html] new ${newHtml.length}B blocks=${blocks.length}`);
      return { edit, raw, blocks, outputMode };
    }

    // ─── DSL 模式（state-toggle / new-overlay）────────────────────
    if (outputMode === "dsl") {
      let tree, compiled;
      try {
        const parsed = parseDslResponse(raw);
        // 容错：允许 LLM 输出 { tree: {...} }，也允许直接给一个 HMNode（无外层 tree 包裹）
        tree = parsed && parsed.tree && typeof parsed.tree === "object"
          ? parsed.tree
          : parsed;
        tree = normalizeSuccessToastTree(tree, edit, normalizedReq);
        tree = normalizeLoadingButtonTree(tree, edit, normalizedReq);
        tree = injectListTitlePlaceholder(tree);
        // 任何 state-toggle（不论 selector 单 id 还是多 id）都应 strip chrome：
        // 这种 edit 的语义是"在 base 里替换某段子 frame"，绝不应该全屏 fixed 覆盖。
        if (
          edit.type === "state-toggle" &&
          resolvedAnchor &&
          (resolvedAnchor.mode === "selector" || resolvedAnchor.mode === "multi-selector")
        ) {
          tree = stripChromeForInlineEdit(tree);
        }
        // F26 (v37) 取代 F15/F17/F23/F25 中 tree.props.style 直接注入的方案：
        //   旧方案：检测多种条件（shadow / 多 ID / treeIsLarge）→ 给 root tree.props.style
        //          注入 position:fixed 居中。条件复杂，容易漏触发。
        //   新方案：把"是否需要逃逸"的判断挪到 [NEW] block 装配时，给整个 [NEW] 外包一层
        //          fixed inset:0 + flex center + padding 避让骨架 的透明 wrapper。
        //          不动 tree 自身，对任何 tree 类型（Column/Row/Page/FullscreenPanel）都生效。
        //   触发条件：state-toggle 模式，且 anchor 在 absolute / overflow:hidden 容器内
        //          （base 自带的小 D2C 子 frame 经常如此，新内容塞不下会被 hidden 裁掉）。
        // F15 保留：浮卡 root（带 shadow）+ 内容大 → 仍加 max-height:80vh + overflow-y:auto 防超 viewport
        if (
          edit.type === "state-toggle" &&
          tree &&
          (tree.type === "Column" || tree.type === "Row") &&
          tree.props && tree.props.shadow
        ) {
          tree.props.style = (tree.props.style ? tree.props.style + ";" : "") + "max-height:80vh;overflow-y:auto";
        }
      } catch (e) {
        return { edit, raw, blocks: [], error: `DSL JSON 解析失败：${e.message}`, outputMode };
      }
      try {
        compiled = compileDslFragment(tree, {
          stateId: currentReq?.state_id,
          assetPrefix,
          log: (m) => log(`[twoPhase/${edit.id}/dsl] ${m}`),
        });
      } catch (e) {
        const tag = e instanceof HMDslError ? "DSL 编译失败" : "DSL 渲染异常";
        return { edit, raw, blocks: [], error: `${tag}：${e.message}`, outputMode };
      }
      const wrapTag = edit.type === "new-overlay" ? "【临时】" : "【持久】";
      const wrapped = wrapWithTaskComment(compiled.html, stateName, wrapTag);
      // 装配 block：
      //   new-overlay      → 统一插入 </body> 前。不要信任 LLM 选择的 Pixso frame：
      //                       空 div / 内部 frame 会被 patcher 拒绝或被 D2C 容器裁剪。
      //   state-toggle 单 id → NEW = 直接用编译产物整段替换 anchor
      //   state-toggle 多 id → replace_at 那段用编译产物替换；其他 id 段[NEW]=""（整段删除）。
      //                       多 block 在 patcher 里按位置倒序应用，互不影响。
      let blocks;
      if (edit.type === "new-overlay") {
        // F27b (v38)：new-overlay 默认插在 </body> 前，如果 LLM tree 是 Column 等
        // normal-flow 类型，会落到文档末尾。给它套一层逃逸 wrapper：
        //   - tree 本身已是 Page/FullscreenPanel（编译出 fixed inset:0）→ 直接用，跳过 wrapper
        //   - 否则一律包 escape wrapper（fixed center + padding 避让 chrome）
        const treeIsFullscreen = tree && (tree.type === "Page" || tree.type === "FullscreenPanel");
        const overlayHtml = treeIsFullscreen ? wrapped : wrapInEscapeOverlay(wrapped, edit.id);
        if (!treeIsFullscreen) {
          log(`[twoPhase/${edit.id}/anchor] 🪂 new-overlay 默认包逃逸 wrapper（fixed center + 避让骨架），确保 Toast/弹窗居中显示且 chrome 透出`);
        }
        blocks = [["</body>", `${overlayHtml}\n</body>`]];
      } else if (resolvedAnchor.mode === "multi-selector") {
        const currentReplace = resolvedAnchor.resolved.find(seg => seg.isReplaceAt);
        if (currentReplace && looksLikeEmptyReplaceTarget(currentReplace)) {
          const best = chooseBestReplaceSegment(resolvedAnchor);
          if (best && best.id !== currentReplace.id) {
            for (const seg of resolvedAnchor.resolved) {
              seg.isReplaceAt = (seg.id === best.id);
            }
            log(`[twoPhase/${edit.id}/anchor] ⚙ replace_at 自动纠偏：原 replace_at=#${currentReplace.id} (${currentReplace.realAnchor.length}B, 空容器风险) → #${best.id} (${best.realAnchor.length}B)`);
          }
        }
        // F26 (v37) for multi-selector：删多个 base frame 后，replace_at 那段新内容
        // 失去原父定位（被删的 sibling frame 都是 absolute 共用 D2C container）。
        // 给 [NEW] 外包逃逸 wrapper 保证显示。
        // 触发条件：任一被删/替换的 anchor 段含 absolute / overflow:hidden
        const anyAbsolute = resolvedAnchor.resolved.some(seg => needsEscapeWrapper(seg.realAnchor, tree, prevHtml));
        let newContent = anyAbsolute ? wrapInEscapeOverlay(wrapped, edit.id) : wrapped;
        if (dimMaskIds.length) {
          newContent = appendMaskNeutralizeStyle(newContent, dimMaskIds);
          log(`[twoPhase/${edit.id}/anchor] ⚙ 检测到历史暗色遮罩 frame(${dimMaskIds.join(",")})，注入背景中和样式避免 state_3~5 发灰`);
        }
        if (anyAbsolute) {
          log(`[twoPhase/${edit.id}/anchor] 🪂 multi-selector 删多 id 含 absolute 容器 → [NEW] 外包逃逸 wrapper`);
        }
        blocks = resolvedAnchor.resolved.map(seg =>
          seg.isReplaceAt ? [seg.realAnchor, newContent] : [seg.realAnchor, ""]
        );
      } else {
        // F19 (v33)：anchor 是上一态 DSL 降级路径留下的 wrapper（\`hm-dsl-root-st<N>\`）→
        // 包一层 fixed overlay 容器
        let wrappedFinal = isDslWrapperAnchor(resolvedAnchor.realAnchor)
          ? wrapInFixedOverlay(wrapped, stateName, edit.id)
          : wrapped;
        if (wrappedFinal !== wrapped) {
          log(`[twoPhase/${edit.id}/anchor] 锚是上一态 DSL wrapper（hm-dsl-root-*），自动包 fixed overlay 容器以保留全屏居中`);
        }
        // state_2 通过 F26 生成 hm-escape-* wrapper，后续 state_3/4/5 若直接替换该锚，
        // 必须继续保留 fixed 逃逸层，否则内容会落回普通流导致上半区错位/裁剪。
        if (isEscapeWrapperAnchor(resolvedAnchor.realAnchor)) {
          wrappedFinal = wrapInEscapeOverlay(wrappedFinal, edit.id);
          log(`[twoPhase/${edit.id}/anchor] 锚是上一态 escape wrapper（hm-escape-*），继续包逃逸 wrapper 以保持卡片完整显示`);
        }
        // F26 (v37)：检测 anchor 是否在 base 的 absolute / overflow:hidden 容器内。
        //   D2C 导出的 Pixso frame 大多 absolute 定位 + 固定 height + overflow:hidden，
        //   新内容塞不下会被裁。给 [NEW] 外包一层"逃逸 wrapper"——
        //   fixed inset:0 + flex center + padding 避让骨架（top 60px 留给状态栏，
        //   bottom 90px 留给底导）+ 透明背景（base chrome 透出）+ inner 自带卡片样式。
        //   这样不论 base 容器多小、被多深嵌套，新内容都能"逃出"到 viewport 中央显示。
        if (!isDslWrapperAnchor(resolvedAnchor.realAnchor) && needsEscapeWrapper(resolvedAnchor.realAnchor, tree, prevHtml)) {
          wrappedFinal = wrapInEscapeOverlay(wrappedFinal, edit.id);
          log(`[twoPhase/${edit.id}/anchor] 🪂 锚在 base 的 absolute/overflow:hidden 容器内，[NEW] 外包逃逸 wrapper（fixed center + 避让骨架），确保新内容完全显示不被裁`);
        }
        if (dimMaskIds.length) {
          wrappedFinal = appendMaskNeutralizeStyle(wrappedFinal, dimMaskIds);
          log(`[twoPhase/${edit.id}/anchor] ⚙ 注入暗色遮罩中和样式：${dimMaskIds.join(",")}`);
        }
        blocks = [[resolvedAnchor.realAnchor, wrappedFinal]];
      }
      log(`[twoPhase/${edit.id}/dsl] tree.type=${tree.type} compiled ${compiled.html.length}B blocks=${blocks.length}`);
      return {
        edit, raw, blocks, outputMode,
        dslWarnings: compiled.warnings,
      };
    }

    // ─── inline 模式（text-edit / delete）────────────────────────
    const content = stripCodeFences(raw);
    let blocks;
    try {
      blocks = parseBlocks(content);
    } catch (e) {
      return { edit, raw, blocks: [], error: e.message, outputMode };
    }
    return { edit, raw, blocks, outputMode };
  });

  // ── 5. 合并所有 [OLD][NEW] 块 ────────────────────────────────────
  // 严格模式（HM_TWOPHASE_STRICT=1，默认）：任一 edit 失败立即抛错。
  // 避免"以为修好了但其实某个核心 edit 被静默吞了"的假象（v37 前的典型问题）。
  const STRICT_MODE = process.env.HM_TWOPHASE_STRICT !== "0";
  const allBlocks = [];
  let okCount = 0;
  const failures = [];
  for (const r of skill2Results) {
    if (r.error) {
      log(`[twoPhase/${r.edit.id}/warn] skill2 失败：${r.error}`);
      failures.push(`${r.edit.id}(${r.edit.type}): ${r.error}`);
      continue;
    }
    if (!r.blocks.length) {
      log(`[twoPhase/${r.edit.id}/warn] skill2 未解析出 [OLD][NEW] 块`);
      failures.push(`${r.edit.id}(${r.edit.type}): 零块`);
      continue;
    }
    okCount++;
    for (const b of r.blocks) allBlocks.push(b);
  }

  if (!allBlocks.length) {
    throw new Error("twoPhase: 所有 skill2 失败或零块，拒绝沿用 base HTML");
  }
  if (STRICT_MODE && failures.length > 0) {
    throw new Error(`twoPhase 严格模式：${failures.length}/${plan.edits.length} 个 edit 失败，拒绝产出残缺 state — ${failures.join(" | ")}`);
  }

  // ── 6. 应用替换 ──────────────────────────────────────────────────
  const { html: patched, appliedCount, skippedCount } =
    applyReplacementsInMemory(prevHtml, allBlocks, { log });

  log(`[twoPhase] skill2 OK=${okCount}/${plan.edits.length}，patcher applied=${appliedCount}/${allBlocks.length}`);

  if (appliedCount === 0) {
    throw new Error(`twoPhase: patcher 未应用任何替换块（skipped=${skippedCount}/${allBlocks.length}），拒绝产出空改动 state`);
  }

  // ── 7. 占位标签展开（[HM:Tag attr=value] → 真实鸿蒙组件 HTML） ────
  // 这是 twoPhase 唯一允许的"字符串展开"步骤，对应"AI 输出框架 + 组件占位"策略；
  // 即使 LLM 没用占位标签，expandHmTags 也会顺手注入 Material Icons 字体（mi class）。
  let finalHtml = patched;
  let hmExpanded = 0;
  let hmMissing = [];
  let hmExpansions = [];
  try {
    const exp = expandHmTags(patched, { assetPrefix, log });
    finalHtml = exp.html;
    hmExpanded = exp.expanded || 0;
    hmMissing = exp.missing || [];
    hmExpansions = exp.expansions || [];
    if (hmExpanded > 0) {
      log(`[twoPhase] expandHmTags 替换 ${hmExpanded} 个占位标签`);
    }
    if (hmMissing.length) {
      log(`[twoPhase/warn] expandHmTags 未识别的标签：${hmMissing.join(", ")}`);
    }
  } catch (e) {
    log(`[twoPhase/warn] expandHmTags 异常 ${e.message}（沿用未展开的 HTML）`);
  }

  // ── 8. 清理游离的任务节点注释残骸 ─────────────────────────────────
  // 当 inline text-edit/state-toggle 用 literal OLD 覆盖了"任务节点开始/结束"
  // 注释对的一半时，剩下的另一半要么变成"半残注释"，要么 fuzzy 匹配把 `<!--`
  // 切掉，留下 `任务名【临时|持久】 -->` 直接以纯文本显示在页面顶部。
  // 这里做后处理：扫所有"任务节点开始 / 结束"注释，去掉不配对的孤儿。
  finalHtml = cleanupOrphanTaskComments(finalHtml, log);

  // ── 9. 修复半残 </body> / </html> 闭标签 ────────────────────────
  // inline fuzzy 匹配偶尔把 \`</body>\` 的 \`<\` 切掉，留下 \`/body>\` 纯文本，
  // 顶部 / 底部就会冒出 "/body>" 字样。
  finalHtml = fixDanglingCloseTags(finalHtml, log);

  // ── 10. 清理"任务节点结束"注释之后的 HTML 残骸 ──────────────────
  // 当 anchor literal fuzzy 匹配只切到 OLD 的中段（未匹完结尾），剩下的 OLD
  // 尾部留在 base 里：典型是 `:#XXXXXX;...">文字</span></div>` 这种"半截 CSS
  // 属性 + 半截闭标签"——直接以纯文本形式出现在页面里（v30 new_test/2 state_4
  // 底部冒出 \`:#999999;text-align:left;line-height:1.4;">点击添加项目</span>\` 根因）。
  // 启发式：紧跟"任务节点结束"注释之后的字符若不是 \`<\`/空白/换行，则该
  // 注释到下一个 \`<\` 之间是残骸，整段删除。
  finalHtml = stripAfterTaskCommentJunk(finalHtml, log);
  finalHtml = cleanupStaleIdCssRules(finalHtml, log);
  if (isFullScreenFormContext(normalizedReq) && !isToastSuccessContext(normalizedReq)) {
    finalHtml = stripTemporaryTaskOverlaysForFullscreen(finalHtml, log);
  }

  return {
    html: finalHtml,
    applied: appliedCount,
    skipped: skippedCount + (plan.edits.length - okCount),
    raw: skill1Raw + "\n\n--- skill2 outputs ---\n" + skill2Results.map(r => r.raw).join("\n[NEXT]\n"),
    twoPhase: { skill1: plan, skill2: skill2Results },
    hmExpansions,
    hmMissing,
  };
}

module.exports = {
  patchOneStateViaTwoPhase,
};
