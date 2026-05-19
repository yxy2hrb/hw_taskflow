// ──────────────────────────────────────────────────────────────────────
// Skill 1 — 规划阶段 prompt 模板
// 输入：当前 HTML + 当前 state spec + 视觉父信息 + 全 spec 列表 + 语言
// 输出：JSON { noop, edits: [{ id, type, anchor, instruction, components_needed?, icons_needed? }] }
// ──────────────────────────────────────────────────────────────────────
"use strict";

const { CORE_10_RULES, languageHint } = require("./common");

// F24 (v36 终版)：自动扫描 base HTML，分类**所有顶层 Pixso 子 frame**：
//   - 骨架（永不动）：StatusBar / BottomTab / Canvas root
//   - 内容子 frame（state-toggle 应该 anchor 的候选）
// prompt 列出两类清单，强制 LLM 用**多 id 锚 + 最小覆盖范围**而不是"省事选整页"。
function buildSkeletonSection(html) {
  if (typeof html !== "string" || !html) {
    return "（base HTML 为空，跳过骨架分析）";
  }
  const skeleton = scanBaseSkeleton(html);
  const stableAnchors = scanHmStableAnchors(html);
  const lines = [];

  if (skeleton.statusBars.length === 0 && skeleton.bottomTabs.length === 0 && skeleton.canvasRoots.length === 0 && skeleton.contentFrames.length === 0 && stableAnchors.length === 0) {
    return "（未检测到典型 D2C frame 结构——本 base 可能是非 Pixso 输出）";
  }

  lines.push("我扫了一下 base 的 D2C frame 结构，按【是否可作 anchor】分类如下：");
  lines.push("");

  // ── 骨架（默认避开；彻底新页面例外） ──
  if (skeleton.statusBars.length || skeleton.bottomTabs.length || skeleton.canvasRoots.length) {
    lines.push("🚫 **骨架元素（默认避开 anchor — 见下方【例外】条款）**：");
    for (const s of skeleton.statusBars) {
      lines.push(`   - \`#${s.id}\` (${s.size}B) — 🔴 顶部状态栏（含时间/信号/电量）`);
    }
    for (const b of skeleton.bottomTabs) {
      lines.push(`   - \`#${b.id}\` (${b.size}B) — 🔴 底部 Tab 导航（${b.labels.join("/")}）`);
    }
    for (const c of skeleton.canvasRoots) {
      lines.push(`   - \`#${c.id}\` (${c.size}B) — ⛔ 顶层 canvas root（含 StatusBar + 内容 + BottomTab；选它会把骨架一起替换）`);
    }
    lines.push("");
  }

  // ── 内容子 frame（可作 anchor 的最小单元） ──
  if (skeleton.contentFrames.length) {
    lines.push("✅ **内容子 frame（state-toggle 锚的首选 — 精准选其中需要改的那几个）**：");
    for (const f of skeleton.contentFrames) {
      const hint = f.label ? ` — ${f.label}` : "";
      const emptyMark = f.isEmpty ? " ⚠ 空容器（不能作为 replace_at）" : "";
      lines.push(`   - \`#${f.id}\` (${f.size}B)${hint}${emptyMark}`);
    }
    lines.push("");
    lines.push("   📌 replace_at 选择规则：");
    lines.push("     - 必须选**非空**内容子 frame（size 通常更大、含真实子树）");
    lines.push("     - 禁止选标了“空容器（不能作为 replace_at）”的 id（会触发空锚点拒绝）");
    lines.push("");
  }

  // ── hm-* 稳定子 id（上一态 skill2 生成时打入的“跨态可锚定 id”） ──
  if (stableAnchors.length) {
    lines.push("🧷 **上一态生成的稳定子 id（hm-* 系列，优先用于本态的小范围 state-toggle / text-edit）**：");
    for (const a of stableAnchors) {
      const tagInfo = a.tag ? `<${a.tag}>` : "";
      const labelInfo = a.label ? ` — ${a.label}` : "";
      lines.push(`   - \`#${a.id}\` ${tagInfo} (${a.size}B)${labelInfo}`);
    }
    lines.push("");
    lines.push("   📌 何时优先用这些 hm-* id（强烈推荐 — 这是为小改设计的精细锚）：");
    lines.push("     - 当 description 是【仅改 X / 保持其余不变 / 与上一态完全一致 + 单点变更】这类“小改”，");
    lines.push("       **必须**锚到这里的某个 \`hm-*\` 子 id（比如改按钮 disabled → 锚 \`#hm-confirm-btn\`）；");
    lines.push("     - 严禁此时选 D2C 顶层 frame（如 \`#14_807584\`）做 state-toggle —— 会把整页主内容卷走，");
    lines.push("       表单结构丢失（典型翻车：v37 state_4 “按钮变灰”锚到 #14_807584 导致页面空白）；");
    lines.push("     - 如果想做的小改对应的 hm-* id 在上方清单里**找不到**，说明上一态 skill2 没打 id，");
    lines.push("       这时只能走 \`text-edit\` literal 模式（拷贝最小 HTML 片段），仍然**禁止**用顶层 frame state-toggle。");
    lines.push("");
  }

  lines.push("📐 **最小覆盖原则（铁律 - F24 v36）**：");
  lines.push("   ▸ **默认情形 — 95% 的 state**：");
  lines.push("     - 不要选骨架元素 id（StatusBar / BottomTab / Canvas root），不要把它们放进多 id 锚数组。");
  lines.push("     - 从【内容子 frame】清单里选**所有需要修改的**子 frame，组成多 id 锚数组：");
  lines.push("       ```");
  lines.push("       \"type\": \"state-toggle\",");
  lines.push("       \"anchor\": [\"#内容子A\", \"#内容子B\", \"#内容子C\"],");
  lines.push("       \"replace_at\": \"#内容子A\",  // 只能是非空内容子 frame");
  lines.push("       ```");
  lines.push("     - **关键**：不是【选最少的 id】，而是【选覆盖范围最小且能完整覆盖差异的 id 列表】；");
  lines.push("        如果有 3 个内容子 frame 都要换，就列 3 个 id，**不要**用一个大 frame anchor 偷懒。");
  lines.push("     - patcher 会拒绝单 id anchor 覆盖 > 60% body 的整页选择（除非命中下面的例外）。");
  lines.push("");
  lines.push("   ▸ **例外情形 — 5% 的 state（【彻底新页面】）**：");
  lines.push("     当 blueprint 明确描述为以下情形之一，允许选骨架 id / canvas root 把 base 全部替换：");
  lines.push("       · 【彻底替换 / 完全脱离 base / 整页重画 / 整张换页】");
  lines.push("       · 【启动页 / 闪屏 / Splash / Onboarding / 引导页 / 欢迎页】");
  lines.push("       · 【全新独立页面 / 与原 base 无关 / 视觉风格完全不同】");
  lines.push("     此时直接用 \\`\"anchor\": \"#canvas-root-id\"\\` 即可，patcher 会放行。");
  lines.push("");
  lines.push("   ▸ **判定流程**：");
  lines.push("     1. 当前 state 的 description / implementation_method 是不是【彻底新页面】？");
  lines.push("        → 是：用 canvas root id 作 anchor（整页替换 OK）");
  lines.push("        → 否：进 2");
  lines.push("     2. 列出【实际需要变更】的子 frame id 列表，组成多 id 锚（最小覆盖范围）");
  return lines.join("\n");
}

function scanBaseSkeleton(html) {
  const out = { statusBars: [], bottomTabs: [], canvasRoots: [], contentFrames: [] };
  // body 顶层 frames（深度 0 的 <div id class="Pixso-frame-">）
  const topFrames = scanFramesAtRoot(html);
  const TAB_WORDS = ["首页", "商城", "工作台", "服务", "我的", "项目", "消息", "我"];

  // 第一步：找 canvas root（覆盖 > 50% 文档的 frame）
  for (const f of topFrames) {
    if (f.outer.length > html.length * 0.4) {
      out.canvasRoots.push({ id: f.id, size: f.outer.length, inner: f.inner });
    }
  }
  // 第二步：扫 canvas root 内部的"直接子 frame"
  const innerFrames = out.canvasRoots.length
    ? scanFramesAtRoot(out.canvasRoots[0].inner)
    : topFrames; // 没有 canvas root → 直接用顶层 frames 当内容子 frame

  for (const f of innerFrames) {
    const labelHits = TAB_WORDS.filter(t => f.outer.includes(t));
    const vectorCount = (f.outer.match(/Pixso-vector|Pixso-rectangle/g) || []).length;
    const innerTextLen = (f.outer.replace(/<[^>]+>/g, "").trim()).length;

    if (labelHits.length >= 3 && /<p\b/i.test(f.outer)) {
      out.bottomTabs.push({ id: f.id, size: f.outer.length, labels: labelHits });
    } else if (f.outer.length < 1500 && vectorCount >= 4 && labelHits.length === 0 && innerTextLen < 30) {
      out.statusBars.push({ id: f.id, size: f.outer.length });
    } else {
      // 内容子 frame：尝试提取人类可读 label（取第一个 <p>/<span> 文字）
      const labelMatch = f.outer.match(/<(?:p|span|h\d)[^>]*>([^<\n]{2,30})<\//);
      // 检测是否为"空容器"——outer 很小（< 200B）且 inner 几乎无 DOM。
      // 这种空 div 在 D2C 里是占位背景层（如 #14_807629 outer 56B），
      // 不能作 replace_at（patcher 会判定"空锚点"拒绝）；标 isEmpty 让 LLM 警觉。
      const innerStripped = (f.inner || "").trim();
      const isEmpty = f.outer.length < 200 && (innerStripped.length === 0 || !/<\w/.test(innerStripped));
      out.contentFrames.push({
        id: f.id,
        size: f.outer.length,
        label: labelMatch ? labelMatch[1].trim() : "",
        isEmpty,
      });
    }
  }
  // 内容子 frame 太多就截断（避免 prompt 爆炸）
  if (out.contentFrames.length > 25) {
    const extra = out.contentFrames.length - 25;
    out.contentFrames = out.contentFrames.slice(0, 25);
    out.contentFrames.push({ id: "...", size: 0, label: `（还有 ${extra} 个未列出，请按需查阅 base HTML）`, isEmpty: false });
  }
  // 去掉 canvas root 里"剥离 inner"字段（不需要 prompt）
  for (const c of out.canvasRoots) delete c.inner;
  return out;
}

/**
 * 扫 base HTML 里所有 id="hm-*"（含字母数字、`-`、`_`）的元素，
 * 按出现顺序返回 [{ id, tag, size, label, outer }]。
 *
 * 用途：让 skill1 在做小范围 state-toggle / text-edit 时优先锚到这些"上一态 skill2 打的稳定子 id"，
 * 避免选 D2C 顶层 frame 把整页主内容卷走。
 *
 * 算法：在 body 范围内 regex 找到 `<tag ... id="hm-*" ...>` 开标签，再做轻量平衡扫描找闭标签。
 * 注意：只取 outer 的前 80 字符做 label 取样（找第一个 >2 字符文本）。
 */
function scanHmStableAnchors(html) {
  const out = [];
  if (typeof html !== "string" || !html) return out;
  const bodyM = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = bodyM ? bodyM[1] : html;
  const baseOffset = bodyM ? bodyM.index + bodyM[0].indexOf(bodyM[1]) : 0;
  const startRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?\bid\s*=\s*["'](hm-[A-Za-z0-9_\-]+)["'][^>]*?>/g;
  const seen = new Set();
  let m;
  while ((m = startRe.exec(body)) !== null) {
    const tag = m[1].toLowerCase();
    const id = m[2];
    if (seen.has(id)) continue;
    const openTag = m[0];
    const startIdx = m.index;
    const openEnd = startIdx + openTag.length;
    // 自闭合 / void
    const isVoid = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag);
    let endIdx = openEnd;
    if (openTag.endsWith("/>") || isVoid) {
      endIdx = openEnd;
    } else {
      // 平衡扫描同 tag 闭合
      const tagRe = new RegExp(`<(/?)${tag}\\b([^>]*)>`, "gi");
      tagRe.lastIndex = openEnd;
      let depth = 1;
      let mm;
      while ((mm = tagRe.exec(body)) !== null) {
        const isClose = mm[1] === "/";
        const attrs = mm[2] || "";
        if (isClose) {
          depth--;
          if (depth === 0) { endIdx = mm.index + mm[0].length; break; }
        } else if (!attrs.trimEnd().endsWith("/")) {
          depth++;
        }
      }
    }
    const outer = body.slice(startIdx, endIdx);
    if (!outer) continue;
    seen.add(id);
    // 取第一个可见文本节点作为人类可读标签
    const innerOnly = outer.slice(openTag.length, outer.length - (`</${tag}>`).length);
    const textM = (innerOnly || "").match(/>([^<>\n]{2,30})</);
    const label = textM ? textM[1].trim() : "";
    out.push({
      id,
      tag,
      size: outer.length,
      label,
    });
  }
  // 防 prompt 爆炸
  if (out.length > 30) {
    const extra = out.length - 30;
    out.length = 30;
    out.push({ id: "...", tag: "", size: 0, label: `（还有 ${extra} 个未列出）` });
  }
  return out;
}

function scanFramesAtRoot(html) {
  // 仅扫深度 0 的 <div id="X_Y" class="Pixso-frame-..."> 子节点
  // 用平衡扫描，跳过嵌套
  const out = [];
  if (typeof html !== "string" || !html) return out;
  const re = /<div\s+id="(\d+_\d+)"\s+class="(Pixso-frame-\d+[^"]*)"[^>]*>/g;
  let cursor = 0;
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(html)) !== null) {
    if (m.index < cursor) continue; // 该 frame 在已扫过的子树里 → 跳过
    const startTagEnd = m.index + m[0].length;
    let depth = 1;
    let i = startTagEnd;
    const openRe = /<div\b[^>]*>/g;
    const closeRe = /<\/div>/g;
    while (depth > 0 && i < html.length) {
      openRe.lastIndex = i;
      closeRe.lastIndex = i;
      const o = openRe.exec(html);
      const c = closeRe.exec(html);
      if (!c) break;
      if (o && o.index < c.index) {
        depth++;
        i = o.index + o[0].length;
      } else {
        depth--;
        i = c.index + c[0].length;
        if (depth === 0) {
          out.push({
            id: m[1],
            cls: m[2],
            outer: html.slice(m.index, i),
            inner: html.slice(startTagEnd, c.index),
          });
          cursor = i;
          re.lastIndex = i;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * 拼装 skill1 的完整 prompt。
 * @param {object} ctx
 * @param {object} ctx.currentReq - 当前 state requirement
 * @param {string} ctx.html       - 当前 HTML (base for this state)
 * @param {Array}  ctx.allRequirements - 全 state spec 列表（用于上下文）
 * @param {string} ctx.languagePrimary - "zh" | "en" | "mixed"
 * @returns {string}
 */
function buildSkill1Prompt(ctx) {
  const { currentReq, html, allRequirements, languagePrimary } = ctx;
  const stateById = new Map();
  for (const s of (allRequirements || [])) {
    if (s && typeof s.state_id === "number") stateById.set(s.state_id, s);
  }
  const lastStateId = currentReq?.last_state;
  const lastStateRec = (lastStateId != null) ? stateById.get(lastStateId) : null;
  const lastStateName = lastStateRec ? (lastStateRec.state_name || `state_${lastStateId}`) : null;

  const isCancelOrResetState = /取消|恢复初始|dismiss|cancel|关闭弹窗|关闭浮层|返回原页/.test(
    `${currentReq?.state_name || ""} ${currentReq?.description || ""}`
  );

  const allPayload = JSON.stringify(allRequirements || [], null, 2);
  const curPayload = JSON.stringify(currentReq, null, 2);

  return `
你是一名 UI 任务流"规划师"。你的工作是**只规划，不写代码**：
读懂当前 state 的需求 → 在 base HTML 里找到要改的锚点 → 把"要做的事"拆成一个个原子 edit 条目。

==================【页面语言】==================
${languageHint(languagePrimary)}

${CORE_10_RULES}

==================【⚠️ base HTML 的来源】==================
本 state 的 base **不是"流程时间序的上一个 state"**，而是 last_state = ${lastStateId == null ? "null" : lastStateId}${lastStateName ? `（即「${lastStateName}」）` : ""} 对应的 HTML 快照。
因此 anchor 必须能在【base HTML】里**逐字找到**；如果你凭"上一步流程"凭空写一段 anchor，下游会报"未找到"。

==================【🦴 base 骨架 ID 清单（必读 - F24 v35）】==================
${buildSkeletonSection(html)}

==================【⚠️ anchor 写法 - 三种模式（new-overlay / state-toggle 必读）】==================

▸ 模式 A · selector 简写【单 id — text-edit / delete / 小范围 state-toggle】
   anchor 直接写 \`"#<id>"\`，例如：
     "anchor": "#14_349770"
   平台会自动从 base HTML 里**精确提取** id="14_349770" 这个元素的**完整整段**（开标签 + 所有子节点 + 闭标签）。
   - token 极省（你不用复述 5KB 的 D2C 子树）；
   - 零错字风险（不会出现"空格 / 属性顺序 / 省略号"导致的 mismatch）；
   - id 必须是 base HTML 里**真实存在**的 D2C id（你能在 base 里搜到 \`id="14_349770"\` 那一行）。

   ✅ 何时用单 id：要改的整段刚好对应 base 里**一个** id 包住的子树。
   ❌ 严禁单 id 选"覆盖整页的顶层 Pixso-frame"（含 100% 宽 + 多个内容子区 + 状态栏 + 底Tab的那个）—
      这会把状态栏 / 顶导 / 底导一起替换掉。改用模式 A+（多 id 锚）。

▸ 模式 A+ · 多 id 锚 + replace_at【新增 — state-toggle 的标准做法，最小修改原则】
   当"要替换的内容"在 base 里**跨多个独立子 frame**（例如要把"我要办会区块 + 分享获客数据区块 +
   虚拟体验项目区块"三块换成"项目场景表单 + 项目名称表单 + 加载占位"），但你**不想动**顶部状态栏、
   顶导、底导栏——这时 anchor 必须写**多 id 数组**，配合 \`replace_at\` 字段指明 NEW_CODE 落到哪一段：

     "anchor": ["#14_884717", "#14_884324", "#14_884802"],   ← 三块都要"消失"
     "replace_at": "#14_884717",                               ← NEW_CODE 落到这块（其他两块整段删除）

   patcher 的行为：把 \`replace_at\` 那段整段替换为 skill2 生成的 NEW_CODE；其余 id 段直接删除。
   原 base 的状态栏 / 顶导 / 底导（不在 anchor 数组里）原样保留。

   ✅ 何时用多 id：
     - state-toggle 要改的内容跨越**多个 D2C 兄弟 frame**，并且**不能动 chrome**（状态栏/顶导/底导）；
     - 蓝图描述里出现"保留状态栏" / "保留底部 Tab" / "顶部导航不变" / "只替换中间内容区"等措辞；
     - 任何"全屏页"场景，只要 base 自带状态栏/顶导/底导，就**必须**用多 id（不能选顶层 frame）。

   ⚠ 选 id 的策略（看 base HTML 时务必照做）：
     1. **先识别 chrome**：base 里通常有 \`<!-- 顶部状态栏 -->\`、\`<!-- 顶部导航栏 -->\`、
        \`<!-- 底部导航栏 -->\` 这类语义注释，紧跟着的 \`<div id="N_NNNN" ...>\` 就是 chrome frame。
        **chrome frame 的 id 永远不要列进 anchor 数组**（它们要保留）。
     2. **再识别内容区**：注释里出现 \`<!-- XXX区块 -->\`、\`<!-- 主内容 -->\`、\`<!-- 卡片流 -->\`
        紧跟的 frame 才是你能动的内容子 frame。
     3. **不要锚顶层 frame**：直接挂在 \`<body>\` → \`Pixso-canvas-...\` 下面的那个超大 frame（通常 width:100%、
        height 等于整页高度，是状态栏/顶导/内容/底导的共同父节点）—— 一旦把它列进 anchor 数组，
        相当于"整页都要删除"，会触发后端的覆盖率校验报错。
     4. **互不嵌套**：anchor 数组里列出的 id 必须是**兄弟**关系（互不嵌套）。
        ❌ 反例：anchor=["#14_884797","#14_884800"] 但 14_884800 是 14_884797 的**子孙**节点 ——
           这会让 patcher 在删除嵌套段时位置错乱、把后续 \`</body>\` 等闭合标签一起截掉。
        ✅ 正例：anchor=["#我要办会区块id","#分享获客id","#虚拟体验id"] —— 三块都是顶层
           frame 的**直接平级兄弟** frame。
        判断方法：在 base HTML 里看每个 id 的 div 缩进层级，**只列同一层级的兄弟 id**；
                  如果你想删的内容横跨"一个 id 包另一个 id"，**只写最外层 id 就够**——
                  外层删了，内层自然消失。

▸ 模式 B · literal 完整 HTML 片段【仅限 text-edit / delete】
   anchor 写 base 里**逐字拷贝**出来的一段 HTML（不能加省略号 / 不能改空格 / 不能改属性顺序）。
   - text-edit：拷贝包含目标文字的最小片段（如 \`<span class="text-...">138*****1234</span>\`）；
   - delete：拷贝要纯删除的完整开/闭标签片段。

▸ 严禁混用（v8 / v9 翻车的典型反面教材）
   ❌ "anchor": "<div id=\\"14_349770\\" class=\\"...\\">...</div>"   ← 带省略号永远找不到
   ❌ "anchor": "<div id=\\"14_349770\\">"                            ← 半开标签也找不到
   ❌ "anchor": "div#14_349770"                                       ← 不要 CSS 选择器写法
   ❌ "anchor": "script"                                              ← v9 翻车原因：裸 tag 名
   ❌ "anchor": "</body>"                                             ← 裸闭标签关键字也禁止
   ❌ "anchor": "footer"   "body"   "main"   "div"                    ← 任何不含 \`<\` 的"单词"
   → **以上**全部一律改成** \`"anchor": "#14_349770"\` —— 简、准、稳。

▸ ⚠️ literal 锚点最小校验（自检规则）
   如果你执意走 literal 模式（不写 \`#<id>\`），写好后默问一遍：
     □ 我的 anchor 字符串里有没有 \`<\`？没有就**必须改成 \`#<id>\`** 或加完整开标签拷贝。
     □ 这串字符在 base HTML 里的出现次数是不是 ≤ 2 次？（grep 一下；多于 2 次必歧义）
     □ 如果用了 \`<script>\`、\`<body>\`、\`<style>\` 等通用标签做 anchor，
       \`<head>\` 内也很可能有同名标签 → 永远改用最后一个 D2C frame 的 \`#<id>\` 锚点。
   v9 test3 state_5 翻车现场就是 anchor="script" 落进 \`<head>\` 内 \`<script src="...">\` 的开标签里，
   把 Toast HTML 切进 script 属性区，截图毫无 Toast。

==================【⚠️ 规划三大铁律 - 违反一条整条 edit 作废】==================

▸ 铁律 A · new-overlay 的 anchor 必须落到 body 直接子节点（不能选 Pixso-frame 内部）
  D2C 导出的 \`<div id="N_NNN" class="Pixso-frame-N_NNN">\` 容器通常带
  \`position:absolute; width:Xpx; overflow:hidden\`，部分还带 \`transform / contain\` 属性。
  如果你把 new-overlay 的 anchor 选到这种 Pixso-frame **内部子节点**，patcher 把浮层挂上去后，
  \`position:fixed; inset:0\` 会被这个祖先 clip 成"窄条 / 长条 / 看不见"，截图就是一片空白或几像素宽。

  ✅ 正确做法：new-overlay anchor 必须挑下面**两类节点之一**：
    1) base 末尾紧贴 \`</body>\` 之前的最后一个 \`<script>...</script>\`（最稳；patcher 会把 [NEW] 接在它前面）；
    2) 若没有 script，挑 body 的**直接子节点**中位于最末位的那个，例如
       \`<div id="某" class="Pixso-frame-某">...完整子树...</div>\`，**且必须把整个子树都纳入 anchor**
       —— 不能只取这个 div 的开标签。这样 [NEW] = 原整段 + 紧跟一个浮层，浮层挂在 body 直接子级下。

  ❌ 严禁挑选：
    - \`<div id="某" class="Pixso-frame-某">\` 这种"半开标签"做 anchor —— 浮层会嵌进 D2C 子树被 clip；
    - body 中间任意 Pixso-frame 的开标签或子节点 —— 同样会被 clip；
    - \`<head>...\` / \`<style>\` / 空 \`<div></div>\` —— 无业务语义。

  📌 检查清单（写 new-overlay anchor 前默问一遍）：
    □ 这个 anchor 是 body 直接子元素吗？
    □ 我是否取了它**整段**（含闭标签）？
    □ patcher 用 [NEW]=anchor原文+浮层 接进去后，浮层会成为 body 直接子级吗？

▸ 铁律 B · "删除并替换"必须用 1 个 state-toggle，禁止 delete + new-overlay 两步走
  当你打算"删除区域 X，并在同位置放一段新内容"时：
    ❌ 错误：拆成 e1=delete(anchor=X) + e2=new-overlay(anchor=X) —— e1 执行后 X 已经不存在，
       e2 会因"anchor 未找到"被 patcher 跳过，最终 X 区域只剩下空白（state_6 空内容态翻车的元凶）。
    ✅ 正确：用 1 个 state-toggle：
        - anchor = X 整段（含开闭标签 + 所有子节点）；
        - type   = "state-toggle"；
        - instruction = "把整段替换为 ..."；
       这样 patcher 一次性把 [OLD]=X、[NEW]=新内容 替换上去，不会有 anchor 失效问题。

  ✅ 何时才用 \`delete\`：**纯删除，不补任何替代内容**（例如"关闭上一态遗留的 overlay 整块"）。
  ✅ 何时才用 \`new-overlay\`：**真正的新增**，原位置本来没有可见 UI（例如新弹出 Dialog / Toast / 抽屉）。

▸ 铁律 D · 幻觉锚点禁用（base 里不存在的元素禁止 delete / state-toggle）
  blueprint 的 description / implementation_method 经常**按时序叙事**写，例如：
    "用户点击'确认'后，筛选面板与遮罩层立即消失，列表整体置灰..."
    "Toast 显示 2s 后淡出，回到原页面..."
    "弹窗关闭，回到主页..."
  这些时序句子假设你看到的是**上一时序态**（state_(N-1)）的画面。但你拿到的 base HTML **只来自 last_state**，
  last_state ≠ N-1 时（视觉血统 vs 时间顺序不一致），base 里根本不存在那个"要消失 / 要关闭 / 要删除"的元素。

  ✅ 处理规则（每个 edit 写之前自检一遍）：
    1) 我打算 \`delete\` / \`state-toggle\` 的 anchor，它在 base HTML 里**逐字找得到**吗？
       - 找不到 → **禁止规划这条 edit**。你看到 description 说"X 消失"，但 base 里没有 X = 这事不需要做。
    2) 如果"要被删除/切换的元素"在 base 里不存在，对应的语义在静态视觉上 = 无操作，直接**跳过**这条意图；
       若整个 state 的所有意图都是这种"删/关一个 base 里没有的东西"，整条规划返回 \`{"noop": true, "edits": []}\`。
    3) "在原位置叠加新内容"（spinner、Toast、空状态卡）总是合法的 \`new-overlay\`——这个不受铁律 D 限制。

  ❌ 反例（state_3 翻车现场）：
     last_state=1（base = 资讯列表初始态，**无筛选面板**），description 写"筛选面板与遮罩层立即消失，列表区域整体置灰，中央悬浮 spinner"。
     LLM 误把"面板消失"翻译成"找一个 anchor 替换掉"，于是 state-toggle 的 anchor 落在列表区某段，结果把正常列表 DOM 整段干掉。

  ✅ 正确写法（该 state 应规划）：
     - **不要**为"面板消失"规划任何 edit（base 里就没有面板，无事可做）；
     - **只**规划 1 个 new-overlay 在 body 末尾的 \`<script>\` 之前接上"半透明遮罩 + 中央 spinner"浮层；
     - 这一条已经把"loading 中"的静态终态画面表达完整。

▸ 铁律 G · "临时浮层"必须用 new-overlay（禁止用 state-toggle 替换某个 base 子 frame）
  blueprint 经常这样描述：
    "弹出 60vh 内嵌弹窗，垂直居中展示项目卡片列表"
    "中央悬浮 spinner，文字'加载中…'"
    "全屏 modal 显示项目详情"
    "页面其他元素保持不变，顶部多一个浮条"
    "Dialog / 抽屉 / Toast / Snackbar / 加载遮罩"
  这些都是**临时浮层** —— 视觉上**浮在 base 上方**，base 主体内容**不变 / 仍可见**。

  ❌ 严禁：type = "state-toggle"，anchor 选某个 base 子 frame（比如选"虚拟体验项目区块" #14_884368 替换为弹窗）。
     翻车现场 v27 new_test/3 state_2 "体验项目内嵌弹窗列表"：LLM 选了 anchor=#14_884368（"虚拟体验项目区块"小子 frame），
     replace_at 把那一段替换为 60vh 灰色弹窗 —— 实际渲染：
       • 我要办会 / 营销物料 / 分享获客 / 管理应用 / 底导 全部仍在 base 里继续显示（没替换走）
       • LLM 生成的 60vh 浮窗只挤在原"虚拟体验项目"那一小段位置，被四周内容夹住看不见
       • 用户截图看到的就是"base 没变 / 弹窗没浮起来"。

  ✅ 必须：type = "new-overlay"
     - anchor 落在 body 直接子节点（参见铁律 A），让 patcher 把浮层挂在 body 最后；
     - tree 根用 \`FullscreenPanel\` 或 \`OverlayMask\`（这两类才能 fixed inset:0 z-index 浮上去）；
     - base 主体不需要任何 edit —— 浮层会盖在所有内容之上。

  📌 判定（这些关键词命中即必须 new-overlay，不许 state-toggle）：
     "内嵌弹窗" / "悬浮卡片列表" / "60vh 弹窗" / "半屏抽屉"
     "加载中过渡态" / "loading 模态" / "spinner 遮罩" / "提交中"
     "全屏 modal" / "Dialog" / "确认弹窗"
     "网络异常 / 加载失败" + "页面其他元素保持不变"

  ❌ 不要被 "区块替换" / "整段替换为弹窗" 这种 description 表述误导 —— 那是写给设计师看的视觉描述，
     不代表 DOM 要替换。Base 的 D2C frame 应该原样保留，浮层另起 new-overlay。

▸ 铁律 F · D2C 单字段值变化必须用 text-edit（禁止 state-toggle / 禁止 DSL 整段重写）
  blueprint 的 description 经常说"X 字段变成 Y 值"，例如：
    "手机号 138*****1234 变成 +86 138*****5678"
    "用户名 张三 → 李四"
    "勾选数 1 → 2"
    "Tab 当前项从 项目 切到 文档"
  这种 base 里某个 D2C 容器内"只是一个文字值要变"的场景：

  ✅ 必须：type = "text-edit"，anchor 取最小可识别片段（literal 模式）：
     - "<span class=\\"text-...\\">138*****1234</span>"（含包裹标签 + 旧值，必须能在 base 中逐字找到）
     - 或者一个最小的 \`<input ... value="138*****1234">\`

  ❌ 严禁：type = "state-toggle"，anchor 选整段 D2C frame（如整张表单 / 整张卡片），
     [NEW] 用 DSL Column 重写整段 —— 这样会丢掉 D2C frame 自带的精细 layout、
     字体、间距、周边图标，截图里你会看到"那一行字幸存但样式全变"的鬼影
     （test/4 state_6 翻车原因：手机号那行被整段 state-toggle 替换，frame 样式全丢）。

  📌 决策清单（一定按这个顺序问自己）：
     □ 我只是要改一个**可见文字值**吗？是 → **text-edit**（不许 state-toggle）
     □ 我要改原元素的 disabled / checked / loading / spinner 状态吗？是 → state-toggle 合理
     □ 我要把整段父容器（含 layout + 字体 + 子节点结构）全部换掉吗？是 → state-toggle 合理
     □ 我要新增一个原本不存在的浮层 / 弹窗 / 全屏页？是 → new-overlay
     □ 我要纯删除某段不补内容？是 → delete

▸ 铁律 I · "全新全屏页/创建页/编辑页 + 保留状态栏/底导" 必须用 multi-id state-toggle 替换 base 主内容（删旧+插新），禁止 new-overlay 浮层、禁止 canvas root 单 id
  典型 description 形态：
    "全屏白色背景页，顶部留出状态栏空间（透明无遮挡），底部 Tab 栏完整可见且保持原样式"
    "进入创建项目集全屏页，保留状态栏与底 Tab"
    "弹出全屏编辑表单页，保留顶部状态栏，禁用底部 Tab"
    "切换到全新设置页，状态栏/底导保留 base 样式"

  特征：base 是某个**首页/工作台**，当前 state 要做一个**结构上不存在于 base 的全新内容区**
       （创建表单、编辑表单、详情页、设置页 ...），同时**显式要求保留状态栏 + 底 Tab**。
       **本质：用户在 DOM 层做了页面跳转**——base 的工作台主内容必须被替换走，不是叠加遮罩。

  ❌ 错误做法 1：type = "state-toggle"，anchor = canvas root 单 id（如 #14_807569）
     → F24 拒绝（单 id 覆盖 body > 60%）；即使放过也会卷走状态栏 / 底导。
  ❌ 错误做法 2：type = "new-overlay"
     → 浮层只是 z-index 覆盖在 base 之上，base 工作台的卡片/标题在 DOM 里**仍然存在**。
       Toast/Dialog/Loading 这种短暂叠加可以这样，但"创建项目集全屏页"是**长期停留的新页面**，
       不应该让 base 工作台内容残留在背景里。

  ✅ 正确做法：type = "state-toggle"，anchor = **多 id 数组（multi-id + replace_at）**
     - anchor = canvas root 下 **除骨架元素（StatusBar / BottomTab）之外** 的所有内容子 frame id 列表
       （从上方"✅ 内容子 frame"清单里**全选**——这一态里**所有 base 主内容都要被删掉换成新页**）
     - replace_at = 内容子 frame 列表里**位置居中或最主要**的那一个 id
       （新页面内容会落到这个位置，其他 id 段的旧 DOM 自动删除）
     - [NEW] = 新页面完整 DSL tree（Column 装名称输入框 + 单选 + 按钮 + 底部确认 ...）
     - 🚫 chrome 千万**不要再画一遍**（StatusBar / BottomTab 必须由 base 透出）

  📌 判定关键词（命中即必须 multi-id state-toggle，禁用 new-overlay 和 canvas root）：
     "全屏" + ("保留状态栏" / "保留底 Tab" / "底部 Tab 栏完整可见" / "顶部状态栏空间")
     "进入<某某>全屏页" / "切换到<某某>页" + "保留 chrome"
     "弹出全屏<编辑/创建/设置>表单页"

  💡 与铁律 G（临时浮层）的区别（**关键判定 — 决定用 multi-id state-toggle 还是 new-overlay**）：
     - 铁律 G：base 主内容**保持不变**，只是临时叠加 Toast/Loading/Dialog 然后消失；用 new-overlay
       关键词："弹出 Toast" "加载中" "提示框" "短暂出现" "X 秒后消失"
     - 铁律 I：base 主内容**被替换**，结构上是真·新页面，可能停留很久；用 multi-id state-toggle
       关键词："进入<新页>" "全屏<创建/编辑/设置>页" "切换到<新页面>"

  📋 示例（v38 new_test/2 state_2 正确写法）：
     base canvas root = #14_807569，骨架 = StatusBar #14_807570 + BottomTab #14_807586，
     内容子 frame = [#14_807585, #14_807629, #14_807630, ...]。
         {
           "id": "e1",
           "type": "state-toggle",
           "anchor": ["#14_807585", "#14_807629", "#14_807630"],
           "replace_at": "#14_807629",
           "instruction": "把整块工作台内容替换为创建项目集表单：名称输入框 / 单选 / 按钮 / 底部确认按钮"
         }
     说明：anchor 列出所有要删的内容子 frame；replace_at = #14_807629（居中主区，新页落这里）；
           其余 id 段（#14_807585、#14_807630）被自动删除；StatusBar / BottomTab 原样保留。

▸ 铁律 H · "画面与 X 完全一致 / 保持不变 / 仅 Y 变更" 时禁止全屏 frame 替换
  blueprint 经常这样描述"持续态变化最小的 state"：
    "页面整体与 state_2 完全一致，红色'确认'按钮变为灰色禁用态"
    "画面与上一态保持一致，仅顶部插入一条 Toast"
    "其余界面元素无任何遮罩、浮层、加载图标或透明度变化"
    "DOM 结构、样式、文本、位置均保持与 state_2 完全一致"
    "画面与 last_state 完全相同，无新增视觉元素"
  这种 description 暗示 **base（即 last_state 的 HTML）已经是用户期望画面的 95%+**，
  你**只能局部小改**——改一个按钮状态、加一行错误文字、加一个 Toast。

  ❌ 严禁：type = "state-toggle"，anchor 选 base 顶层 frame（覆盖 body > 60%）。
     翻车现场 v31 new_test/2 state_3 "提交中过渡态"：description 写"画面与 state_2 完全一致，
     仅按钮变 disabled 提交中"，LLM 选了 anchor=#14_807569（base canvas root，97.6% body 覆盖），
     [NEW] 用 DSL Column 重画了"创建项目集 / 项目集名称 / 描述 / 可见范围 / 提交中…" 整页 →
     截图显示**跟 state_2 完全不一样**（卡片结构、字段都换了），违反"完全一致"约束。

  ✅ 正确路径（按优先级递减）：
     1. 改单个文字 / 值：type = "text-edit"，anchor = "按钮文字" / "字段当前值"
     2. 改按钮 disabled / loading / spinner 状态：type = "state-toggle"，anchor = 那个**按钮的 D2C id**
        （单 id，不许是顶层 frame；目标 [NEW] 只重画**这个按钮**，不重画整页）
     3. 加一行错误提示：type = "new-overlay"，anchor = body 直接子节点，tree 用 FullscreenPanel + OverlayMask + 浮条
     4. 顶部 Toast / Snackbar：type = "new-overlay"，同上

  📌 判定关键词（出现即必须遵守此规则）：
     "完全一致" / "完全相同" / "保持一致" / "保持不变" / "维持原样"
     "DOM 结构 / 样式 / 文本 / 位置均保持与 state_X" 
     "其余界面元素无变化" / "仅 XXX 变更" / "唯一区别"

▸ 铁律 C · instruction 内的"可见文案 / 注释名 / state_name 引用"必须按页面主语言重写
  blueprint（description / implementation_method）里的中文可能来自 phase1-3 的中文规划者，**与页面主语言无关**。
  当你产出 instruction 时：
    - instruction 里**所有用引号包起来的、最终会出现在 HTML 里的文案**——按钮、标题、Toast、占位、空状态——
      必须翻译成当前页面主语言（见上方"页面语言"）。
    - 注释块名（\`<!-- 任务节点开始: XXX【临时】 -->\`）和 state_name 引用：**保持原 state_name 不翻译**
      （patcher 用它做后续 state 的兜底匹配；翻译反而会导致兜底失效）。
    - 但 instruction 里出现的"举例文案"必须按主语言写，例：
        - 页面 lang=en、blueprint 写 'Smart Manufacturing · 最新' → instruction 必须写 'Smart Manufacturing · Latest'；
        - 页面 lang=en、blueprint 写 '暂无内容，重置筛选'      → instruction 必须写 'No content matches your filter criteria' + 'Reset filters'；
        - 页面 lang=zh、blueprint 写 'Confirm'                  → instruction 必须写 '确认'。

  ❌ 反例（state_4 翻车）：lang=en，但 instruction 写 "更新为 'Smart Manufacturing · 最新'" → 截图出现中文"最新"。
  ✅ 正例：lang=en，instruction 写 "更新为 'Smart Manufacturing · Latest'"。

==================【输出格式 - JSON，严格】==================
只输出一个 JSON 对象，不要任何前后缀、不要 Markdown 围栏。Schema：
{
  "noop": false,                                   // true 表示本 state 什么都不用改（base 就是答案，如"取消态/恢复初始态"）
  "edits": [                                       // 多个原子 edit，可空数组
    {
      "id": "e1",                                  // 任意短 id（e1/e2/...）
      "type": "text-edit" | "delete" | "state-toggle" | "new-overlay",
      "anchor": "#<id>"                             // 单 id：text-edit / delete / 小范围 state-toggle / new-overlay
              | ["#<id1>","#<id2>",...]            // 多 id：state-toggle 跨多个子 frame 的最小修改写法（推荐）
              | "<逐字来自 base HTML 的完整片段>",  // literal：仅限 text-edit / delete
      "replace_at": "#<id1>",                       // ⚠ anchor 为数组时**必填**：指 NEW_CODE 落到哪一段；其余 id 段直接删除
      "instruction": "用一句话清楚说明要把这段改成什么 / 删什么 / 加什么",
      "components_needed": ["Dialog","Button","Toast","TextInput","Search","Switch","Checkbox","Radio","ProgressBar","Avatar","IconButton","Card"], // 仅 new-overlay 需要时，最多列要用到的，不需要就省略
      "icons_needed": ["check_circle","close","warning","refresh"]  // 仅有图标时列出 Material Icons Round 名，没有就省略
    }
  ]
}

📌 决策树（每条 state-toggle 写之前默问）：
  □ 我要改的内容**整段**对应 base 里的**一个** id 包住的子树吗？
     是 → anchor 用 \`"#id"\` 单字符串模式。
  □ 我要改的内容**跨多个**兄弟 id 子树（如多个"区块"），但状态栏/顶导/底导**必须保留**？
     是 → anchor 用 \`["#id1","#id2",...]\` 数组 + \`replace_at\`，按"最小修改原则"避开 chrome。
  □ 我打算用单 id 把"覆盖整页"的那个超大 frame 替换掉？
     **禁止** —— 后端会用"覆盖率 > 60%"校验拒绝这种 anchor。改用多 id 模式。

==================【4 种 edit type 的判定规则】==================
- **text-edit**：仅修改原有元素的"可见文字 / 颜色 / 状态 class / 数字"等小幅属性，DOM 结构不变。
    例："按钮文字 Follow → Following"、"红点数字 3 → 4"。
- **delete**：**纯删除**某个元素（[NEW] 留空）—— 仅当"删了之后这个位置就该是空的"才用。
    例："关闭遮罩，把上一态的 overlay 整块去掉"。
    ❌ **绝对禁止**：当你想"删 X，然后在 X 的位置放新内容 Y"时拆成 delete + new-overlay 两个 edit
      （patcher 顺序应用，e1 删完 anchor 就消失了，e2 必然找不到 anchor 被跳过 → 整片空白）。
      → 这种场景请用 **state-toggle**（anchor=X 整段，instruction="把整段替换为 Y"）。
- **state-toggle**：原地状态切换 — 原元素**完整 HTML** 重写为新视觉，含可能的 spinner、loading、checked 状态。
    适用范围（凡满足之一即用 state-toggle，不要拆 delete+new-overlay）：
    - 按钮变 loading / disabled / 文字切换；toggle / checkbox / radio 切换状态；
    - 输入框预填值 + focus 边框；点赞数 +1；
    - **就地把卡片流 / 列表区 / 内容区"换成另一个版本"**（如空状态卡、错误卡、骨架屏）；
    - 把已有 D2C 容器**整段重写**为新内容（含整段隐藏 / 整段替换）。
    例："按钮变为'Cancelling…'+加 spinner"、"toggle 切到关闭"、"卡片流区域整段换成空状态卡"。
- **new-overlay**：**真正的新增**可见浮层 / 弹窗 / Toast / 全屏覆盖页 / 抽屉 / Snackbar
  —— 原位置本来没有可见 UI，是从无到有"叠加"上去。
    anchor **强烈推荐用 selector 简写**："#<id>" —— id 取 base 末尾紧贴 \`</body>\` 之前最后一个带 id 的 D2C Pixso-frame
    （patcher 会自动展开成完整整段，浮层会挂在它后面，自动成为 body 直接子级，满足铁律 A 的位置要求）。
    instruction 必须包括：含哪些组件、需要哪些图标、必要的文案（已按页面主语言翻译，见【铁律 C】）。
    本类是唯一会注入鸿蒙规范摘要 + 组件参考的，请把"需要哪些组件"详尽列在 components_needed 里。
    如果是"下拉 / 内嵌菜单 / Popover / Dropdown / 无遮罩"：
      - type 仍可用 new-overlay；
      - instruction 必须显式写："无遮罩，禁止 OverlayMask，使用 fixed Column/Row 贴近触发入口下方"；
      - components_needed 写 ["Dropdown"] 或 ["Popover"]，不要写 ["Dialog"]。

==================【判定 noop = true 的场景】==================
当且仅当当前 state 的语义是"取消 / 恢复初始 / 关闭弹窗 / 返回原页"且 base 已经是关闭后的样子时，
直接返回 {"noop": true, "edits": []}。
${isCancelOrResetState ? `
🛑 **当前 state 强制 noop（违反必翻车）**：
  当前 state_name / description 含"取消 / 关闭 / 返回 / 恢复初始 / dismiss / cancel"语义。
  base 已经是 last_state（${lastStateName || `state_${lastStateId}`}）的最终静态画面 = "关闭/取消之后应该呈现的样子"。
  **你必须直接返回 \`{"noop": true, "edits": []}\`**，禁止规划任何 edit。

  ❌ 严禁这种错误规划（state_5 翻车原因）：
     blueprint 的 implementation_method 写了"面板向右滑出 0.3s 后 display:none / 移除 DOM"，
     你以为"动画结束 = 要去 base 里删一些东西"，于是规划了一堆 delete edit 去清理 base 里"看起来像上一态浮层"的元素。
     **这是致命错误**：base 是 last_state 的 HTML 快照，里面没有任何上一态的浮层 —— 你看到的所有元素（行业分类标签栏、"All"按钮、Pixso 容器等）
     都是 base 自己的固有 UI，删了就会把页面正常内容也删光，截图大块空白。

  ✅ 正确：直接返回 \`{"noop": true, "edits": []}\`，patcher 会把 base 原样作为本 state 的输出。` : ""}

==================【⚠️ 动画/过渡/延迟语义 → 静态终态映射规则】==================
blueprint 的 description / implementation_method 偶尔会出现"滑入 / 滑出 / 淡入 / 淡出 / 缓动 / 0.3s / X 秒后消失 / 动画结束后 display:none"等动画/延迟描述。

下游生成的是**静态截图快照**（无 JS、无 transition、无时间流逝）。所以你必须把这些"动画过程"翻译成"动画结束的静态终态"再去规划：

| blueprint 写的动画/延迟描述 | 你应该规划成什么 |
|---|---|
| "面板从右滑入 0.3s 缓动" | 1 个 new-overlay edit，写"面板停在屏幕右侧 70vw，左侧 30vw 为半透明遮罩"（不要写 transition/animation） |
| "面板向右缓动滑出 0.3s 后 display:none" | **noop=true**（面板已经关闭，base = 关闭后的样子） |
| "Toast 显示 2s 后淡出" | 1 个 new-overlay edit，写"Toast 显示在顶部居中，fit-content 窄条、圆角、阴影"（截图的是"显示中"的稳定一帧） |
| "骨架屏闪烁加载 1s" | 1 个 state-toggle edit，写"骨架屏：三条灰色横条 rgba(0,0,0,0.08)"（不写闪烁，只画静态骨架） |
| "弹窗淡入显示" | 1 个 new-overlay edit，写"弹窗居中显示在遮罩之上"（不写 fade-in） |
| "底部抽屉自下而上滑出" | 1 个 new-overlay edit，写"抽屉贴底，高度 X，圆角 16px"（不写 translateY） |

❌ 严禁：把"滑出 / 淡出 / 动画结束后移除"理解成"我需要去 base 里删一堆元素"——
  **base 已经是动画结束的样子**，所以"滑出后消失"这种语义 = noop / 无需任何 edit。
❌ 严禁：把"骨架屏闪烁"翻译成"骨架色用 #F1F3F5（页面背景同色）"——
  骨架屏静态视觉对比度规则见下方"骨架/loading 视觉对比度"。

==================【骨架 / loading 视觉对比度规则】==================
当你规划"骨架屏 / loading 占位 / 内容加载中"类 state（通常是 state-toggle 把内容区换成骨架）时：
- instruction 必须明确"骨架色用 \`rgba(0,0,0,0.08)\` 或 \`#E5E7EB\`"——**禁止与页面背景同色**；
- 页面背景常见为 \`#F1F3F5\` / \`#FFFFFF\`，所以骨架色绝不能取 \`#F1F3F5\` / \`#F3F3F3\` / \`#FAFAFA\`（截图肉眼看不到）；
- 推荐对比度：骨架色 \`rgba(0,0,0,0.08)\` ~ \`rgba(0,0,0,0.12)\`，圆角 4px，条间距 8px；
- 可选脉动效果 \`@keyframes hmpulse{0%,100%{opacity:1}50%{opacity:0.5}}\` —— 但这是视觉表达，不是"延迟语义"，允许使用。

==================【Toast / Snackbar 规划规则】==================
当 state 只是"成功 / 失败 / 网络异常 / 已保存 / 已提交"等**轻量提示**（页面其他内容不变，只多浮一个窄条）时：

▸ **type 强制 new-overlay**，**禁止用 state-toggle**（会把原内容区也覆盖掉，提示就嵌进表单里去了）。
  ❌ 反例：state_4 "创建成功" 写成 state-toggle anchor=#内容区 → Toast 嵌进了三维模型容器内部；
  ✅ 正例：type=new-overlay, anchor=#<body 末尾最后一个带 id 的 Pixso-frame>，
          instruction 写"顶部居中悬浮 Toast，背景 #64BB5C 圆角 8，宽 fit-content..."。

▸ instruction 必须写"顶部居中悬浮窄条"，不要写"宽100%"、"全宽"、"通栏"，除非原图明确是 Banner；
▸ 成功 Toast 使用成功色 #64BB5C，圆角 8，阴影 0 4px 12px rgba(0,0,0,0.06)，左右 padding 16；
▸ 必须说明"无遮罩，不覆盖底部 Tab 和状态栏"；
▸ 若需要图标，写 Material Icons Round 名（成功用 check_circle，失败用 error）。

📌 判定（这些 state_name / description 模式必走 new-overlay）：
   - "创建成功 / 创建失败 / 保存成功 / 提交成功 / 删除成功 / 操作成功"
   - "网络异常 / 网络不可用 / 加载失败"
   - "Toast / Snackbar / 提示" 字样
   - 任何"页面其他元素保持不变 + 顶部多一个浮条"语义

==================【尺寸与位置规划（新增硬约束）】==================
当你规划的是"新卡片 / 新页面 / 新浮层"时，instruction 必须包含可执行的尺寸与位置信息，
让 skill2 直接生成 HTML 时不会出现"位置漂移/尺寸不确定/被遮挡"：

- 必写至少 2 项尺寸信息：width / max-width / height / min-height / padding；
- 必写至少 1 项定位信息：top / left / right / bottom / center（例如 left=50% + translateX）；
- 必写层级信息：z-index（overlay/new-overlay 必须给）；
- 若描述是"保留状态栏/底部 Tab"，instruction 要明确"不要重画状态栏/底部Tab，仅替换中间内容区"；
- 若是 state-toggle 多锚点，instruction 要注明"replace_at 承载新内容，其余锚点删除"。

示例（好）：
"替换为居中卡片：max-width 320px，width calc(100% - 32px)，top 96px，left 50%，transform translateX(-50%)，padding 16px，z-index 1000。"

示例（坏）：
"替换为新页面，风格一致。"（无尺寸/位置，执行不可控）

==================【任务节点【临时】块改名（重点）】==================
若你要改的元素位于一个 \`<!-- 任务节点开始: <旧 state 名>【临时】 -->...<!-- 任务节点结束: <旧 state 名>【临时】 -->\`
注释块内，且本任务是它的"子状态变化"（例 编辑页 → 编辑页提交中），请把 edit 的 anchor 取整个块（含两条注释），
type 选 state-toggle，instruction 务必写明"把外层注释名改为 ${currentReq?.state_name || ""}【临时】"。

==================【全 spec 上下文】==================
${allPayload}

==================【当前 state requirement】==================
${curPayload}

==================【base HTML】==================
${html}
`.trim();
}

/**
 * 严格解析 skill1 输出。容错处理：JSON 围栏、行间杂质。
 * @returns {{noop:boolean, edits:Array}}
 */
function parseSkill1Response(raw) {
  if (typeof raw !== "string") throw new Error("skill1 返回非字符串");
  let s = raw.trim();
  // 剥 markdown 围栏
  s = s.replace(/^```(?:json|JSON)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  // 抽出第一个 { 到最后一个 }
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i < 0 || j < 0 || j < i) throw new Error("skill1 输出未找到 JSON 对象");
  s = s.slice(i, j + 1);
  let obj;
  try {
    obj = JSON.parse(s);
  } catch (e) {
    throw new Error(`skill1 JSON parse 失败：${e.message}（原文片段 ${s.slice(0, 200)}...）`);
  }
  if (typeof obj !== "object" || obj === null) throw new Error("skill1 输出不是对象");
  const noop = !!obj.noop;
  let edits = Array.isArray(obj.edits) ? obj.edits : [];
  // 标准化：补 id、过滤无效条目
  const VALID_TYPES = new Set(["text-edit", "delete", "state-toggle", "new-overlay"]);
  edits = edits
    .filter((e) => e && typeof e === "object")
    .map((e, idx) => {
      // anchor 兼容三种：string（单 id / literal）、string[]（多 id）、{ ids, replace_at } 旧 LLM 偶尔的对象形式
      let anchor;
      let replaceAt;
      if (Array.isArray(e.anchor)) {
        anchor = e.anchor.map((s) => (typeof s === "string" ? s : "")).filter(Boolean);
        replaceAt = typeof e.replace_at === "string" ? e.replace_at : undefined;
      } else if (e.anchor && typeof e.anchor === "object" && Array.isArray(e.anchor.ids)) {
        anchor = e.anchor.ids.map((s) => (typeof s === "string" ? s : "")).filter(Boolean);
        replaceAt = typeof e.anchor.replace_at === "string"
          ? e.anchor.replace_at
          : (typeof e.replace_at === "string" ? e.replace_at : undefined);
      } else if (typeof e.anchor === "string") {
        anchor = e.anchor;
        replaceAt = typeof e.replace_at === "string" ? e.replace_at : undefined;
      } else {
        anchor = "";
      }
      return {
        id: e.id || `e${idx + 1}`,
        type: VALID_TYPES.has(e.type) ? e.type : "text-edit",
        anchor,
        replace_at: replaceAt,
        instruction: typeof e.instruction === "string" ? e.instruction : "",
        components_needed: Array.isArray(e.components_needed) ? e.components_needed.filter(Boolean) : [],
        icons_needed: Array.isArray(e.icons_needed) ? e.icons_needed.filter(Boolean) : [],
      };
    })
    .filter((e) => {
      if (e.instruction.length === 0) return false;
      if (e.type === "delete") return true;
      if (Array.isArray(e.anchor)) return e.anchor.length > 0;
      return typeof e.anchor === "string" && e.anchor.length > 0;
    });
  return { noop, edits };
}

module.exports = {
  buildSkill1Prompt,
  parseSkill1Response,
  scanBaseSkeleton,
  scanHmStableAnchors,
};
