"use strict";
/**
 * HM 组件占位标签 → 真实鸿蒙组件 HTML 替换器。
 *
 * 思路：
 *   - LLM 不直接生成组件代码，只在 [NEW] 块里写占位标签：
 *       [HM:Dialog title="确认下载" content="..." confirmText="确认" cancelText="取消"]
 *       [HM:Button label="提交" variant=primary]
 *       [HM:Toast text="下载成功"]
 *     等等。
 *   - 应用 patch 之后，本模块扫整个 HTML，把每个 [HM:XXX ...] 替换为对应组件的 D2C HTML
 *     （来自 pixso-snapshot.json）。
 *   - 这样 prompt 里只需要塞"组件清单 + 用法说明"（约 1KB），不需要塞完整组件 HTML（每个 ~3KB）。
 *
 * 关键设计决定：
 *   - 所有 HM 标签都按"自闭合"处理（即使写成 [HM:Dialog ...]），避免嵌套解析。
 *     Dialog 这种容器组件通过参数（confirmText/cancelText/title/content）一次性配齐。
 *   - 替换时给每个组件包一个 .hm-scope-<id> 类，并把 D2C 的 CSS 选择器全部前缀化，
 *     避免 className 冲突 / 污染原 HTML。
 *   - 占位文本（如 Dialog 里的 "AAAAA..."、Button 的 "BUTTON"、Toast 的 "Toast content"）
 *     按"字面替换"方式注入用户传入的真实文本。
 */

const path = require("path");
const snap = require("./pixsoSnapshot");
const assetCache = require("./pixsoAssetCache");

// ─── 标签注册表 ──────────────────────────────────────────────────────────────
// group：在 snapshot.components 里按 c.group === <group> 找
// fields：标签属性 → D2C HTML 里的占位文本（直接做字面替换）
// variants：可选的 variant=xxx 主题色覆盖（写在 wrapper 的 inline style 上以 CSS variable 形式）
const REGISTRY = {
  Dialog: {
    group: "Dialog-Phone",
    description: "居中遮罩对话框；自带圆角+毛玻璃+主体文案，按需在外层套自己的遮罩 div。",
    fields: {
      content: { placeholder: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", default: "确认执行该操作吗？" },
      title:   { placeholder: null, default: null },
    },
    suggestedAttrs: ["content"],
    note: "如需双按钮，外层另写 Button 标签：在 Dialog 之后/旁边并列两个 [HM:Button]",
  },
  Button: {
    group: "Button-Phone",
    description: "胶囊主按钮（默认蓝主按钮态），用 variant 切换次/警告/文字风格。",
    fields: {
      label: { placeholder: "BUTTON", default: "按钮" },
    },
    variants: {
      primary:   { fillBg: "rgba(10,89,247,1)",        textColor: "#FFFFFF" },
      secondary: { fillBg: "rgba(0,0,0,0.05)",         textColor: "rgba(0,0,0,0.90)" },
      warning:   { fillBg: "rgba(232,64,38,1)",        textColor: "#FFFFFF" },
      text:      { fillBg: "transparent",              textColor: "rgba(10,89,247,1)" },
    },
    suggestedAttrs: ["label", "variant"],
  },
  Toast: {
    group: "Toast-Phone",
    description: "底部短消息提示，带阴影模糊背景。",
    fields: {
      text: { placeholder: "Toast content", default: "操作成功" },
    },
    suggestedAttrs: ["text"],
  },
  TextInput: {
    group: "TextInput-Box-Phone",
    description: "灰底带圆角输入框，含右侧图标位。",
    fields: {
      placeholder: { placeholder: "Hint", default: "请输入" },
    },
    suggestedAttrs: ["placeholder"],
  },
  Search: {
    group: "Search-Phone",
    description: "顶部搜索条。",
    fields: {},
  },
  PopupTip: {
    group: "PopupTip-Phone",
    description: "气泡提示，带尖角箭头，多行文本。",
    fields: {
      text: { placeholder: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", default: "提示信息" },
    },
    suggestedAttrs: ["text"],
  },
  Switch:   { group: "Switch-Phone", description: "开关，state=on|off。", fields: {} },
  Checkbox: { group: "CheckBox-Phone", description: "复选框，state=on|off。", fields: {} },
  Radio:    { group: "Radio-Phone", description: "单选框，state=on|off。", fields: {} },
  Slider:   { group: "Slider-Phone", description: "滑块。", fields: {} },
  ProgressBar: {
    group: "ProgressBar-Linear-Phone",
    description: "线性进度条（默认横向）。",
    fields: {},
  },
  Avatar:     { group: "4.Avatar", description: "圆形头像。", fields: {} },
  IconButton: { group: "3.Icon Button", description: "Icon 按钮（40x40 默认尺寸）。", fields: {} },
  BottomTab:  { group: "BottomTab-Phone", description: "底部导航 tab。", fields: {} },
  ChipsTab:   { group: "ChipsTab-Phone", description: "横向 chip 形 tab 选择器。", fields: {} },
  SegmentedButton: { group: "SegmentedButton-Phone", description: "分段控件。", fields: {} },
  Card:       { group: ".single card", description: "单卡片。", fields: { title: { placeholder: "标题", default: "标题" } } },
};

// ─── 公共：读 snapshot 实际拿得到的 tag 子集 ────────────────────────────────
function getAvailableRegistry() {
  const s = snap.read();
  const groups = new Set((s.components || []).map((c) => c.group));
  const out = {};
  for (const [tag, reg] of Object.entries(REGISTRY)) {
    if (groups.has(reg.group)) out[tag] = reg;
  }
  return out;
}

/** 给 LLM 看的"组件清单 markdown"，用来代替之前塞完整 D2C HTML。 */
function buildComponentManifest() {
  const reg = getAvailableRegistry();
  const tagNames = Object.keys(reg);
  if (!tagNames.length) {
    return "（鸿蒙组件 snapshot 暂无可用组件，本次不强制使用占位标签。）";
  }
  const lines = [];
  lines.push("==================【可用鸿蒙组件占位标签（最高优先级使用）】==================");
  lines.push("生成 [NEW] 块时，遇到下列 UI 元素**优先使用占位标签**，最终会被自动替换为真实鸿蒙组件代码。");
  lines.push("语法：[HM:TagName attr=\"value\" attr2=value2]，自闭合，不需要 [/HM:TagName]。");
  lines.push("");
  for (const tag of tagNames) {
    const r = reg[tag];
    const attrLine = [];
    for (const [name, conf] of Object.entries(r.fields || {})) {
      const sample = conf.default || (name === "label" ? "确认" : name === "text" ? "提示" : "...");
      attrLine.push(`${name}="${sample}"`);
    }
    if (r.variants) attrLine.push(`variant=${Object.keys(r.variants).join("|")}`);
    const usage = `[HM:${tag}${attrLine.length ? " " + attrLine.join(" ") : ""}]`;
    lines.push(`▸ ${tag.padEnd(16)} ${r.description}`);
    lines.push(`    用法: ${usage}`);
  }
  lines.push("");
  lines.push("规则：");
  lines.push("  ✦ 标签外层（遮罩、定位、自定义容器）你自己用 inline style 写。");
  lines.push("  ✦ 一个标签 = 一个完整组件 DOM；不要再嵌套 [HM:...] 在另一个 [HM:...] 内部。");
  lines.push("  ✦ 不在清单内的 UI（自定义卡片、复杂布局等）才需要你手写 HTML（仍要遵守色板/圆角规范）。");
  lines.push("  ✦ 使用占位标签时，相关 inline style **不需要再自己写一遍**，标签会被真实组件代码替换。");
  lines.push("=========================================================================================");
  return lines.join("\n");
}

// ─── HM tag 解析与替换 ─────────────────────────────────────────────────────
const TAG_RE = /\[HM:(\w+)((?:\s+[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s\]]+))*)\s*\/?\s*\]/g;

function parseAttrs(rawAttrs) {
  const out = {};
  if (!rawAttrs) return out;
  const re = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
  let m;
  while ((m = re.exec(rawAttrs)) !== null) {
    out[m[1]] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
  }
  return out;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractStyleAndBody(code) {
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let css = styleMatch ? styleMatch[1] : "";
  let body = (bodyMatch ? bodyMatch[1] : code).trim();
  body = body.replace(/^<div[^>]*class=["']container["'][^>]*>([\s\S]*)<\/div>\s*$/i, "$1").trim();
  return { css, body };
}

// 过滤 reset / 全局规则；把每个 rule 的选择器加 scope 前缀。
// 过滤通用/reset 类型的选择器；其他选择器加 scope 前缀。
const RESET_SEL_RE = /^(\*|html|body|span|ol|ul|menu|\.container|li::marker|li::before|ol\s+li::marker|ul\s+li::before)$/;
function isResetSelector(sel) {
  return RESET_SEL_RE.test(sel.trim());
}
function scopeCss(css, scopeClass) {
  if (!css) return "";
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  const out = [];
  let m;
  while ((m = ruleRe.exec(css)) !== null) {
    const rawSel = m[1].trim();
    const body = m[2].trim();
    if (!rawSel || !body) continue;
    if (/^@/.test(rawSel)) { out.push(`${rawSel} { ${body} }`); continue; } // @font-face 等保留
    // 多选择器：每个子选择器单独判断 reset；只要还有非 reset 子选择器就保留剩下的
    const parts = rawSel.split(",").map(s => s.trim()).filter(s => s && !isResetSelector(s));
    if (!parts.length) continue;
    const scoped = parts.map(s => `.${scopeClass} ${s}`).join(", ");
    out.push(`${scoped} { ${body} }`);
  }
  return out.join("\n");
}

function applyTextReplacements(body, fields, attrs) {
  for (const [name, conf] of Object.entries(fields || {})) {
    const value = attrs[name] != null ? attrs[name] : conf.default;
    if (value == null) continue;
    if (!conf.placeholder) continue;
    body = body.split(conf.placeholder).join(escapeHtml(value));
  }
  return body;
}

function applyVariant(comp, body, css, reg, attrs) {
  if (!reg.variants) return { body, css };
  const v = reg.variants[attrs.variant];
  if (!v) return { body, css };
  // 取组件根 .symbol-<id> 作为主选择器，文字覆盖到所有 <p>。
  const rootCls = `.symbol-${(comp.id || "").replace(":", "_")}`;
  const overrideCss = [];
  if (v.fillBg)    overrideCss.push(`${rootCls}, ${rootCls} [class^="fill-layer"] { background-color: ${v.fillBg} !important; background-image: none !important; }`);
  if (v.textColor) overrideCss.push(`${rootCls} p { color: ${v.textColor} !important; }`);
  return { body, css: css + "\n" + overrideCss.join("\n") };
}

function renderComponent(comp, reg, attrs, ctx = {}) {
  const instSuffix = ctx.instanceSuffix || ""; // 每个实例独有：避免多实例共享 id/class
  const scopeBase = `hm-${(comp.id || "").replace(/[^a-z0-9]/gi, "-")}`;
  const scope = instSuffix ? `${scopeBase}-${instSuffix}` : scopeBase;
  let { css, body } = extractStyleAndBody(comp.code);
  body = applyTextReplacements(body, reg.fields, attrs);
  ({ body, css } = applyVariant(comp, body, css, reg, attrs));
  // 在 body 中给所有 D2C id (形如 id="数字_数字") 加 instance 后缀，避免多实例 DOM 重 id。
  // 同时同步替换出现在 css 中的 id 选择器（`#数字_数字`）和 class（`class="Pixso-xxx-数字_数字"`）。
  if (instSuffix) {
    const idSet = new Set();
    body.replace(/\bid="(\d+_\d+)"/g, (_, id) => { idSet.add(id); return _; });
    for (const id of idSet) {
      const newId = `${id}__${instSuffix}`;
      const idRe = new RegExp(`\\bid="${id}"`, "g");
      body = body.replace(idRe, `id="${newId}"`);
      // CSS 里若用 #数字_数字 选中（D2C 偶尔生成），同步重命名
      css = css.replace(new RegExp(`#${id}\\b`, "g"), `#${newId}`);
    }
    // class 名中含 `-数字_数字` 后缀的 D2C class（如 `Pixso-frame-44_35158`、`vector-44_35158`），
    // 也给一份带 instance 后缀的同义 class，并把 css 里相应选择器加同义版本。
    const classIdSet = new Set();
    body.replace(/\bclass="([^"]*)"/g, (_, cls) => {
      cls.split(/\s+/).forEach(c => {
        const m = c.match(/^(.+?)-(\d+_\d+)$/);
        if (m) classIdSet.add(c);
      });
      return _;
    });
    for (const oldCls of classIdSet) {
      const newCls = `${oldCls}__${instSuffix}`;
      body = body.replace(new RegExp(`\\bclass="([^"]*)\\b${escapeRegex(oldCls)}\\b([^"]*)"`, "g"),
        (m, p1, p2) => `class="${p1}${oldCls} ${newCls}${p2}"`);
      // css 选择器也补一个同义版本
      css = css.replace(new RegExp(`\\.${escapeRegex(oldCls)}\\b`, "g"), `.${oldCls}, .${newCls}`);
    }
  }
  const scopedCss = scopeCss(css, scope);
  let html = `<div class="${scope}" style="display:inline-block; max-width:100%; flex-shrink:0;"><style>${scopedCss}</style>${body}</div>`;
  html = assetCache.rewritePlaceholders(html, ctx.assetPrefix || "_hm-assets");
  return html;
}

// ─── 鸿蒙图标库（基于 HMSymbolVF.ttf）─────────────────────────────────────────
// snapshot.icons.list 由 scripts/pixso/sync_icons.js 同步。
// 我们额外维护一份 Material Icons 名 → 鸿蒙 icon 名的别名表，让 LLM 用 google
// 命名（pause/play_arrow/...）也能命中鸿蒙图标。匹配不到的回退到 Material Icons。
const MATERIAL_TO_HM_ALIAS = {
  // 操作类
  "delete": "delete",
  "delete_outline": "delete",
  "share": "share",
  "refresh": "refresh",
  "add": "add",
  "remove": "minus",
  "search": "search",
  "more_vert": "more",
  "more_horiz": "more",
  "more": "more",
  "close": "cancel",
  "cancel": "cancel",
  "check": "default",
  "check_circle": "default",
  "done": "default",
  "edit": "highlight",
  "create": "highlight",
  "visibility": "eye",
  "visibility_off": "eye",
  // 导航类
  "arrow_back": "arrow-app-back",
  "arrow_forward": "arrow-right",
  "arrow_drop_down": "arrow-down-small",
  "arrow_drop_up": "arrow-top",
  "arrow_upward": "arrow-top",
  "arrow_downward": "arrow-bottom",
  "chevron_right": "arrow-right-small",
  "chevron_left": "arrow-left-small",
  // 媒体类
  "play_arrow": "play",
  "play_circle": "play",
  "pause": "default",            // 没有真 pause，用空白圆 default 占位
  "pause_circle": "default",
  // 时间
  "schedule": "stopwatch",
  "timer": "stopwatch",
  "history": "stopwatch",
  // 杂项
  "info": "detail",
  "settings": "detail",
  "menu": "more",
  "wb_sunny": "brightness",
  "brightness_5": "brightness",
  "mic": "voice",
  "volume_up": "voice",
  "qr_code_scanner": "scanning",
  "scanner": "scanning",
  "language": "worldclock",
  "schedule_send": "stopwatch",
};

let _iconCache = null;
function getHmIconMap() {
  if (_iconCache !== null) return _iconCache;
  const s = snap.read();
  const list = (s.icons && s.icons.list) || [];
  const map = new Map();
  for (const it of list) {
    if (it && typeof it.name === "string" && typeof it.char === "string") {
      // 同名时优先 keep first（list 按 sync 顺序，前面通常是更主流的 default 状态）
      if (!map.has(it.name)) map.set(it.name, it);
    }
  }
  _iconCache = { list, map };
  return _iconCache;
}

/** 给定一个 LLM 写的 icon name（如 "pause"/"delete"），返回 hm icon 对象或 null。 */
function lookupHmIcon(name) {
  if (typeof name !== "string") return null;
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const { map } = getHmIconMap();
  if (map.has(key)) return map.get(key);
  const aliased = MATERIAL_TO_HM_ALIAS[key];
  if (aliased && map.has(aliased)) return map.get(aliased);
  return null;
}

/**
 * 给 HTML 注入图标字体声明 + 把可命中的 mi 占位转为鸿蒙符号字符。
 * 双路径并存（默认开启鸿蒙优先 + Material Icons 兜底）：
 *   - 路径 A · 鸿蒙 HM Symbol 字体（HMSymbolVF.ttf，PUA 字符）：本地，离线可预览。
 *     检测 <span class="mi">delete</span>，若鸿蒙 manifest 命中或 alias 命中，
 *     就把 innerText 替换为对应 PUA 字符（如 "󰀉"），class 加上 "hm-icon"。
 *   - 路径 B · Google Material Icons Round（外网/CDN，liga 名字渲染）：兜底。
 *     未命中鸿蒙时保留原文 "delete"，由 .mi 继续走 Material Icons Round。
 * 两套 @font-face + 一个 .mi class 一起注入；.hm-icon 优先 HMSymbol。
 */
function injectIconFontIfNeeded(html, assetPrefix, opts = {}) {
  if (typeof html !== "string") return html;
  // force=true：即使 HTML 里暂时没有 .mi 元素，也提前注入字体定义
  // （供 baseline 阶段使用，确保后续 LLM 产生的 <span class="mi"> 始终有字体可用）
  const force = !!opts.force;
  const hasMi = /class\s*=\s*["'][^"']*\bmi\b[^"']*["']/.test(html);
  if (!hasMi && !force) return html;

  const useHarmony = opts.harmonyIcons !== false; // 默认开
  let out = html;
  const hits = []; // { name → char }

  if (useHarmony && hasMi) {
    // 把 <span class="mi" ...>name</span> 这种格式里能命中鸿蒙图标的 name 替换为 PUA 字符。
    // 不破坏其他属性，仅在 class 里追加 "hm-icon"，把 innerText 换成 char。
    out = out.replace(
      /<(span|i)([^>]*\bclass\s*=\s*["'][^"']*\bmi\b[^"']*["'][^>]*)>([\s\S]*?)<\/\1>/gi,
      (full, tag, attrs, inner) => {
        const name = (inner || "").trim();
        if (!name || /[\u{F0000}-\u{FFFFD}]/u.test(name)) return full; // 已是 PUA 不再处理
        const hm = lookupHmIcon(name);
        if (!hm) return full;
        hits.push({ name, char: hm.char, hm: hm.name });
        // 在 class="..." 中追加 hm-icon
        const newAttrs = attrs.replace(
          /(\bclass\s*=\s*["'])([^"']*)(["'])/,
          (m, q1, cls, q2) => q1 + (cls.includes("hm-icon") ? cls : cls + " hm-icon") + q2
        );
        return `<${tag}${newAttrs}>${hm.char}</${tag}>`;
      }
    );
  }

  if (out.includes('id="hm-icon-font"') || out.includes("Material Icons Round")) return out;

  // 注入字体（两套并存）
  const css = [
    "<style id=\"hm-icon-font\">",
    // 鸿蒙符号字体
    "@font-face{",
    "  font-family:'HMSymbol';font-style:normal;font-weight:400;",
    `  src:url('${assetPrefix}/_fonts/HMSymbolVF.ttf') format('truetype');`,
    "}",
    // Google Material Icons Round（兜底）
    "@font-face{",
    "  font-family:'Material Icons Round';font-style:normal;font-weight:400;",
    `  src:url('${assetPrefix}/_fonts/material-icons-round.woff2') format('woff2');`,
    "}",
    ".mi{",
    "  font-family:'HMSymbol','Material Icons Round',sans-serif;",
    "  font-weight:normal;font-style:normal;",
    "  display:inline-block;line-height:1;",
    "  text-transform:none;letter-spacing:normal;word-wrap:normal;white-space:nowrap;",
    "  direction:ltr;",
    "  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;",
    "  -moz-osx-font-smoothing:grayscale;",
    "  font-feature-settings:'liga';",
    "}",
    ".hm-icon{font-family:'HMSymbol',sans-serif;}",
    "</style>",
  ].join("\n");

  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, css + "\n</head>");
  else if (/<html[^>]*>/i.test(out)) out = out.replace(/<html[^>]*>/i, (m) => m + "\n<head>" + css + "</head>");
  else out = css + "\n" + out;
  return out;
}

/**
 * 替换 html 中所有 [HM:TagName ...] 占位标签。
 * @param {string} html
 * @param {object} [opts]
 * @param {(msg:string)=>void} [opts.log]
 * @returns {{ html: string, expanded: number, missing: string[] }}
 */
function expandHmTags(html, opts = {}) {
  const log = opts.log || (() => {});
  const assetPrefix = opts.assetPrefix || "_hm-assets";
  if (typeof html !== "string" || !html.includes("[HM:")) {
    // 即便没有 [HM:] 标签，原始 HTML 中也可能含有 __HM_ASSET__ 占位符（理论上不会，
    // 但鲁棒处理一下），统一过一次重写。
    let rewritten = assetCache.rewritePlaceholders(html || "", assetPrefix);
    rewritten = injectIconFontIfNeeded(rewritten, assetPrefix);
    return { html: rewritten, expanded: 0, missing: [], expansions: [] };
  }
  const s = snap.read();
  const compsByGroup = new Map();
  for (const c of s.components || []) compsByGroup.set(c.group, c);

  const missing = new Set();
  const expansions = []; // 详细记录：每个 [HM:Tag] → 哪个 D2C 组件
  let expanded = 0;
  // 每个 tag 的实例计数器：保证同一 tag 多次出现时 scope/id 唯一。
  // 第 1 次 = ""（保持向后兼容），第 2 次起 = "2"/"3"/...
  const tagInstCount = new Map();
  const out = html.replace(TAG_RE, (full, tagName, rawAttrs) => {
    const reg = REGISTRY[tagName];
    if (!reg) { missing.add(tagName); log(`[HM] 未知 tag: ${tagName}`); return full; }
    const comp = compsByGroup.get(reg.group);
    if (!comp) { missing.add(`${tagName}(${reg.group})`); log(`[HM] snapshot 缺组件: ${reg.group}`); return `<!-- HM:${tagName} 未在 snapshot 中找到 -->`; }
    const attrs = parseAttrs(rawAttrs);
    const idx = (tagInstCount.get(tagName) || 0) + 1;
    tagInstCount.set(tagName, idx);
    const instanceSuffix = idx === 1 ? "" : `i${idx}`;
    expanded++;
    expansions.push({
      tag: tagName,
      attrs,
      instance: idx,
      component: {
        group: comp.group,
        variant: comp.variant,
        node_id: comp.id,
        page: comp.page,
        component_key: comp.componentKey,
      },
    });
    log(`[HM] expand ${tagName}#${idx} attrs=${JSON.stringify(attrs)} → ${reg.group} (id=${comp.id})`);
    return renderComponent(comp, reg, attrs, { assetPrefix, instanceSuffix });
  });
  // 兜底：若 [HM:] 替换之后还残留占位符（例如 prompt 参考块直出的代码段），统一重写。
  let finalHtml = assetCache.rewritePlaceholders(out, assetPrefix);
  // 若 LLM 用了 <span class="mi">...</span>，注入 Material Icons Round @font-face + .mi 样式
  finalHtml = injectIconFontIfNeeded(finalHtml, assetPrefix);
  return { html: finalHtml, expanded, missing: [...missing], expansions };
}

module.exports = {
  REGISTRY,
  getAvailableRegistry,
  buildComponentManifest,
  expandHmTags,
  // 仅供回填脚本/测试使用
  injectIconFontIfNeeded,
  lookupHmIcon,
  MATERIAL_TO_HM_ALIAS,
};
