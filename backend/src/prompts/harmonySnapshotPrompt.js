/**
 * 把 pixso-snapshot.json 渲染成可注入到 LLM patch prompt 的"鸿蒙真实设计 token"段。
 *
 * 设计目标：
 *   - 缺 snapshot 时自动返回 ""，调用方继续用硬编码 fallback；
 *   - 有 snapshot 时把"实测拉到的颜色 / 字体 / 阴影"列成最高优先级，提示模型优先用这些。
 *   - token 数会非常多（185 色），全列进 prompt 太贵；这里挑"鸿蒙最常被需要的"白名单：
 *       brand / warning / confirm / fontPrimary/Secondary/Tertiary / bg* / divider / mask / 几个 floatingShadow。
 *     未命中白名单的 token 不进 prompt，但仍保留在 snapshot 文件里供未来按需使用。
 */
"use strict";

const snap = require("../integrations/pixsoSnapshot");

/** 在 snapshot.tokens.color 里按候选 key 顺序找首个存在的；找不到返回 fallback。 */
function pickColor(colors, candidates, fallback) {
  for (const k of candidates) {
    const v = colors[k] || colors[k.replace(/_/g, "-")] || colors[k.replace(/-/g, "_")];
    if (v) return { key: k, value: v };
  }
  return fallback ? { key: candidates[0], value: fallback } : null;
}
function pickShadow(shadows, candidates, fallback) {
  for (const k of candidates) {
    const v = shadows[k] || shadows[k.replace(/_/g, "-")] || shadows[k.replace(/-/g, "_")];
    if (v) return { key: k, value: v };
  }
  return fallback ? { key: candidates[0], value: fallback } : null;
}

/**
 * 返回一段 markdown，可以直接 ${} 进 patch prompt。snapshot 不存在时返回空串。
 */
function buildHarmonySnapshotBlock() {
  const s = snap.read();
  if (!s || !s.tokens || !Object.keys(s.tokens.color || {}).length) return "";

  const C = s.tokens.color;
  const SH = s.tokens.shadow;

  const lines = [];
  lines.push(`==================【鸿蒙真实设计 Token（来自设计稿 ${s.source.fileName || s.source.fileKey}，最高优先级）】==================`);
  lines.push("以下 Token 直接抓取自 Pixso Token 系统，是当前生效的鸿蒙规范实测值。");
  lines.push("生成新块的 inline style 中，颜色 / 阴影必须优先用这些值；只有当本表无对应 token 时才退到下面的硬编码兜底。");
  lines.push("(snapshot fileName=" + (s.source.fileName || "n/a") + ", fetchedAt=" + s.fetchedAt + ")");
  lines.push("");

  // 颜色 - 按用途分桶
  // 鸿蒙官方"主品牌色 / 焦点"是 #0A59F7（interactive_focus），不是 background_emphasize 的 #317AF7
  const brand     = pickColor(C, ["interactive_focus", "system-ohos_id_color_focused_outline", "brand", "comp_background_emphasize"], "#0A59F7");
  const warning   = pickColor(C, ["system-ohos_id_color_warning", "warning"], "#E84026");
  const confirm   = pickColor(C, ["confirm", "comp_background_success"], "#64BB5C");
  const fontPri   = pickColor(C, ["font_primary", "text-ohos_id_color_text_primary"], "rgba(0,0,0,0.90)");
  const fontSec   = pickColor(C, ["font_secondary", "text-ohos_id_color_text_secondary"], "rgba(0,0,0,0.60)");
  const fontTer   = pickColor(C, ["font_tertiary", "text-ohos_id_color_text_tertiary"], "rgba(0,0,0,0.40)");
  const fontOnPri = pickColor(C, ["font_on_primary", "icon_on_primary"], "#FFFFFF");
  const bgPri     = pickColor(C, ["comp_background_primary", "background_primary"], "#FFFFFF");
  const bgSec     = pickColor(C, ["comp_background_secondary", "background_secondary"], "#F1F3F5");
  const bgTer     = pickColor(C, ["comp_background_tertiary", "compbgtertiary"], "rgba(0,0,0,0.05)");
  const divider   = pickColor(C, ["comp_divider", "pc_outline", "system-ohos_id_color_subheading_separator"], "rgba(0,0,0,0.10)");
  const mask      = pickColor(C, ["mask_fourth", "mask"], "rgba(0,0,0,0.40)");

  lines.push("▸ 色板（最高优先级，inline style 直接写右边的 CSS 值）");
  for (const [label, t] of [
    ["brand 主色", brand],
    ["warning 警示", warning],
    ["confirm 成功", confirm],
    ["fontPrimary 主文本", fontPri],
    ["fontSecondary 次文本", fontSec],
    ["fontTertiary 辅助文本", fontTer],
    ["fontOnPrimary 反白文本", fontOnPri],
    ["bgPrimary 一级底", bgPri],
    ["bgSecondary 二级底", bgSec],
    ["bgTertiary 控件灰底", bgTer],
    ["divider 分割线", divider],
    ["mask 遮罩", mask],
  ]) {
    if (t) lines.push(`  - ${label.padEnd(22)} = ${t.value}    (token: ${t.key})`);
  }

  // 阴影
  const cardShadow = pickShadow(SH, ["pcshadow-defaultshadowm", "pc_shadow-floatingshadows", "shadow_card"], "0 8px 24px rgba(0,0,0,0.08)");
  const toastShadow = pickShadow(SH, ["pcshadow-defaultshadowxs", "pcshadow-defaultshadows", "shadow_toast"], "0 4px 12px rgba(0,0,0,0.06)");
  const dialogShadow = pickShadow(SH, ["pc_shadow-floatingshadowm", "pcshadow-floatingshadowm"], "0 12px 32px rgba(0,0,0,0.12)");
  lines.push("");
  lines.push("▸ 阴影（同样最高优先级）");
  if (cardShadow)   lines.push(`  - 卡片 shadow_card     = ${cardShadow.value}    (${cardShadow.key})`);
  if (toastShadow)  lines.push(`  - Toast shadow_toast    = ${toastShadow.value}    (${toastShadow.key})`);
  if (dialogShadow) lines.push(`  - 弹窗 shadow_dialog    = ${dialogShadow.value}    (${dialogShadow.key})`);

  // typography
  const T = s.tokens.typography || {};
  const titleS  = T["font-title_s-bold"]   || T["title-s-bold"];
  const subL    = T["font-subtitle_l-bold"] || T["subtitle-l-bold"];
  const bodyL   = T["font-body_l-medium"]  || T["body-l-medium"];
  const bodyM   = T["font-body_m-medium"]  || T["body-m-medium"];
  const bodyS   = T["font-body_s-regular"] || T["body-s-regular"];
  if (titleS || bodyL || bodyM) {
    lines.push("");
    lines.push("▸ 字体阶梯（统一 HarmonyHeiTi）");
    if (titleS) lines.push(`  - 标题 / 弹窗标题 ≈ ${titleS.fontSize}px ${titleS.fontStyle || "Bold"}     (token: title_s-bold)`);
    if (subL)   lines.push(`  - 副标题       ≈ ${subL.fontSize}px ${subL.fontStyle || "Bold"}    (token: subtitle_l-bold)`);
    if (bodyL)  lines.push(`  - 正文 / 按钮  ≈ ${bodyL.fontSize}px ${bodyL.fontStyle || "Medium"}  (token: body_l-medium)`);
    if (bodyM)  lines.push(`  - 副文案       ≈ ${bodyM.fontSize}px ${bodyM.fontStyle || "Medium"}  (token: body_m-medium)`);
    if (bodyS)  lines.push(`  - 辅助 / Toast ≈ ${bodyS.fontSize}px ${bodyS.fontStyle || "Regular"} (token: body_s-regular)`);
  }

  lines.push("");
  lines.push("⚠ 真实 token 不齐全时（圆角 / 间距 / 部分组件色），才退回下面的硬编码段；本块未列的 token 不要自创。");
  lines.push("=========================================================================================");
  return lines.join("\n");
}

// ─── 组件库（D2C 拉到的真实组件 HTML）按 currentReq 关键词智能挑选 ──
//
// 评分模型：
//   组件名直接被 currentReq 文本里的"专有词"提到 → +6（最强）
//   关键词词典命中（"弹窗"→Dialog 这种）         → +4
//   组件名 token 出现在 currentReq 文本           → +1（弱兜底）
const COMPONENT_KEYWORD_MAP = [
  { kw: ["弹窗", "对话框", "确认", "确认弹窗", "二次确认", "dialog", "alert"], match: ["dialog"] },
  { kw: ["toast", "成功提示", "提示信息", "snackbar"], match: ["toast"] },
  { kw: ["popuptip", "气泡", "tip", "tooltip"], match: ["popuptip"] },
  { kw: ["按钮", "button", "提交按钮", "主按钮", "次按钮"], match: ["button-phone", "button-2in1", "6.button", "icon button"] },
  { kw: ["输入框", "input", "textfield", "form"], match: ["textinput"] },
  { kw: ["搜索", "search"], match: ["search"] },
  { kw: ["进度", "下载进度", "上传进度", "progress", "loading"], match: ["progressbar", "loading", "datapanel"] },
  { kw: ["勾选", "checkbox", "复选框"], match: ["checkbox"] },
  { kw: ["开关", "switch", "切换", "toggle"], match: ["switch"] },
  { kw: ["单选", "radio"], match: ["radio"] },
  { kw: ["滑块", "slider", "拖动条"], match: ["slider"] },
  { kw: ["底部导航", "tabbar", "tab bar", "底部 tab"], match: ["bottomtab"] },
  { kw: ["标题栏", "顶部栏", "titlebar", "navbar"], match: ["titlebar"] },
  { kw: ["菜单", "menu"], match: ["menu", ".items"] },
  { kw: ["列表", "list"], match: ["list", "cardlist", "listgroup"] },
  { kw: ["卡片", "card"], match: ["card"] },
  { kw: ["分段控件", "segmentedbutton", "segment"], match: ["segmentedbutton"] },
  { kw: ["头像", "avatar"], match: ["avatar"] },
  { kw: ["浮层", "popup"], match: ["popup", "popuptip"] },
  { kw: ["二维码", "qrcode"], match: ["qrcode"] },
  { kw: ["颜色选择", "color picker"], match: ["colorpicker", "color slider"] },
];

/**
 * 替代旧"按 currentReq 选 5 个完整组件 D2C HTML"方案：
 * 现在 prompt 只塞"占位标签清单"，组件代码在 patch 应用后由 expandHmTags 直接替换进去。
 * 该函数现在变成对 hmComponentExpander.buildComponentManifest 的薄包装，保留原签名兼容性。
 */
function buildHarmonyComponentReferenceBlock(_currentReq) {
  try {
    const { buildComponentManifest } = require("../integrations/hmComponentExpander");
    return buildComponentManifest();
  } catch (e) {
    return "";
  }
}

// 旧实现：保留供需要"塞完整 D2C 参考"的场景手动调用，但默认不再走这条路径。
function _legacyBuildHarmonyComponentReferenceBlock(currentReq) {
  const s = snap.read();
  const comps = s.components || [];
  if (!comps.length) return "";

  const haystack = [
    currentReq?.state_name,
    currentReq?.description,
    currentReq?.implementation_method,
    typeof currentReq?.changes === "string" ? currentReq.changes : JSON.stringify(currentReq?.changes || ""),
  ].filter(Boolean).join(" ").toLowerCase();

  const scored = comps.map((c) => {
    const name = (c.group || c.variant || "").toLowerCase();
    const variant = (c.variant || "").toLowerCase();
    let score = 0;
    const reasons = [];

    // 组件名核心 token 直接出现在 currentReq 文本里（最强信号）
    const nameTokens = name.replace(/^\.+/, "").split(/[\s\-._]+/).filter(t => t.length >= 4);
    for (const tok of nameTokens) {
      if (haystack.includes(tok)) { score += 6; reasons.push(`name-token:"${tok}"`); break; }
    }

    // 关键词词典
    for (const rule of COMPONENT_KEYWORD_MAP) {
      const kwHit = rule.kw.some(k => haystack.includes(k.toLowerCase()));
      const compMatch = rule.match.some(m => name.includes(m));
      if (kwHit && compMatch) { score += 4; reasons.push(`kw:"${rule.kw.find(k => haystack.includes(k.toLowerCase()))}"→${rule.match.find(m => name.includes(m))}`); }
    }

    // 状态匹配：currentReq 提到 "loading/disabled/error" 时优先选对应 variant
    for (const st of ["loading", "disabled", "error", "actived", "selected", "focus"]) {
      if (haystack.includes(st) && variant.toLowerCase().includes(st)) { score += 1; }
    }

    return { c, score, reasons };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  if (!scored.length) return "";

  const lines = [];
  lines.push("==================【鸿蒙真实组件参考实现（来自 Pixso D2C，最高优先级复刻）】==================");
  lines.push(`基于本次需求关键词，从 ${comps.length} 个真实鸿蒙组件中挑了 ${scored.length} 个最相关的。`);
  lines.push("生成新块时，结构 / inline style / 字号 / 圆角 / 颜色 / padding **优先复刻**这些参考；除非需求里明确要不一样，否则像素级跟随。");
  lines.push("");

  scored.forEach(({ c, score, reasons }, i) => {
    lines.push(`---- 参考 ${i + 1}/${scored.length}：${c.group || c.variant}  (score=${score}, page=${c.page || ""}, reasons=${reasons.join("|")}) ----`);
    const refMd = compactReference(c.code);
    lines.push(refMd);
  });

  lines.push("");
  lines.push("⚠ 上面的 className / id 都是 D2C 自动生成的（symbol-xxx / paragraph-yyy），你输出 [NEW] 时不要保留 className，把每条 .symbol-xxx { ... } 里的 CSS 抽出来塞进对应元素的 inline style。");
  lines.push("⚠ 颜色、字号、padding、border-radius 必须**严格复刻**参考里的数值；这些是设计稿里通过 D2C 抓出来的真鸿蒙规范值，别自由发挥。");
  lines.push("=========================================================================================");
  return lines.join("\n");
}

/**
 * 把 D2C 输出的完整 HTML 文档压缩成一段"CSS + 关键 DOM 结构"的紧凑参考：
 *   - 保留 <style> 块里业务相关的类（symbol-/frame-/paragraph-/rectangle-）
 *   - 删掉 reset 通用类（* / ol / html / body / .container 这些）
 *   - body 内只留容器及以下的 DOM
 *   - 总长度截到 2.5 KB
 */
function compactReference(html) {
  if (!html || typeof html !== "string") return "";

  // 1) 提 style 内容
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  let css = styleMatch ? styleMatch[1] : "";
  if (css) {
    // 拆每个 rule，过滤掉 reset / 通用类
    const ruleRe = /([^{}]+)\{([^{}]+)\}/g;
    const keep = [];
    let m;
    while ((m = ruleRe.exec(css)) !== null) {
      const sel = m[1].trim();
      const body = m[2].trim();
      // 过滤 reset / 全局
      if (/^\*$|^html$|^body$|^span$|^ol|^ul|^menu$|^\.container$/.test(sel)) continue;
      if (sel.length > 80) continue;
      keep.push(`${sel} { ${body.replace(/\s+/g, " ")} }`);
    }
    css = keep.join("\n");
  }

  // 2) 提 body 内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1].trim() : html.trim();
  // 去掉外层 <div class="container">，让模型直接看到组件根
  body = body.replace(/^<div\s+class=["']container["'][^>]*>([\s\S]*)<\/div>\s*$/i, "$1").trim();

  const out = `\`\`\`css\n${css}\n\`\`\`\n\`\`\`html\n${body}\n\`\`\``;
  if (out.length <= 2500) return out;
  // 太长则各自截断
  const cssCut = css.length > 1400 ? css.slice(0, 1400) + "\n/* ...truncated... */" : css;
  const bodyCut = body.length > 800 ? body.slice(0, 800) + "\n<!-- ...truncated... -->" : body;
  return `\`\`\`css\n${cssCut}\n\`\`\`\n\`\`\`html\n${bodyCut}\n\`\`\``;
}

/** 给 frontend 状态栏用的轻量摘要。 */
function buildHarmonySnapshotSummary() {
  const s = snap.read();
  if (!s || !s.fetchedAt) return { hasSnapshot: false };
  return {
    hasSnapshot: true,
    fetchedAt: s.fetchedAt,
    fileName: s.source?.fileName || null,
    counts: {
      color: Object.keys(s.tokens.color || {}).length,
      typography: Object.keys(s.tokens.typography || {}).length,
      shadow: Object.keys(s.tokens.shadow || {}).length,
      radius: Object.keys(s.tokens.radius || {}).length,
      spacing: Object.keys(s.tokens.spacing || {}).length,
      components: (s.components || []).length,
    },
  };
}

module.exports = {
  buildHarmonySnapshotBlock,
  buildHarmonyComponentReferenceBlock,
  buildHarmonySnapshotSummary,
};
