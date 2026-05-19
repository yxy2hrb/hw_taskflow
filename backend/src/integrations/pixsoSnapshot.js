/**
 * 设计系统快照存取。
 *
 * 一份 pixso-snapshot.json 是 patch prompt 的"鸿蒙规范"真源（Single Source of Truth），
 * 替换 harmonySpec.js 里硬编码的 token。设计师改了 Pixso 文件 → 跑一次 sync → 自动刷新。
 *
 * 文件路径：backend/src/specs/pixso-snapshot.json
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SNAPSHOT_PATH = path.resolve(__dirname, "../specs/pixso-snapshot.json");

/** @type {PixsoSnapshot} 默认空快照。 */
const EMPTY_SNAPSHOT = Object.freeze({
  fetchedAt: null,
  source: { mcpUrl: null, fileKey: null, fileName: null },
  tokens: {
    color: {},        // { "brand": "#0A59F7", "warning": "#E84026", ... }
    typography: {},   // { "title-20-bold": { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } }
    radius: {},       // { "card": 16, "button": 20, "dialog": 32 }
    shadow: {},       // { "card": "0 8px 24px rgba(0,0,0,0.08)" }
    spacing: {},      // { "xs": 4, "sm": 8, ... }
  },
  pages: [],          // [{ id, name }]
  components: [],     // [{ id, name, page, variants:[{prop,value}], code:{html?,arkui?} }]
  iconMap: [],        // [{ ohos: "ohos_download", material: "download" }]
});

function ensureDir() {
  const dir = path.dirname(SNAPSHOT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** 读取本地 snapshot；若文件缺失返回 EMPTY_SNAPSHOT 的深拷贝。 */
function read() {
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(EMPTY_SNAPSHOT));
  }
}

/** 原子写入 snapshot.json。 */
function write(snapshot) {
  ensureDir();
  const json = JSON.stringify(snapshot, null, 2);
  const tmp = SNAPSHOT_PATH + ".tmp";
  fs.writeFileSync(tmp, json, "utf-8");
  fs.renameSync(tmp, SNAPSHOT_PATH);
  return SNAPSHOT_PATH;
}

/** 是否已存在有效 snapshot（至少有颜色 token）。 */
function exists() {
  const s = read();
  return !!(s && s.tokens && s.tokens.color && Object.keys(s.tokens.color).length > 0);
}

/**
 * 把 Pixso MCP 返回的 local styles + variables 归一化为我们的 tokens 结构。
 *
 * Pixso Remote MCP 的实际 payload 形态（与文档里部分示例不同，以下是真实抓包）：
 *   get_local_styles → { localStyles: { "<guid>": style, ... } }
 *     style.name        : "Light/comp_background_tertiary" 这类带主题前缀的层级名
 *     style.styleType   : "FILL" | "TEXT" | "EFFECT" | "GRID"
 *     style.fillPaints  : [{ type: "SOLID", color: {r,g,b,a}, opacity, visible }]   ← FILL
 *     style.text        : { fontFamily, fontSize, fontStyle, lineHeight, letterSpacing } ← TEXT
 *     style.effects     : [{ type: "DROP_SHADOW", offset:{x,y}, radius, color, ... }] ← EFFECT
 *
 *   注意：r/g/b 是 0–255 整数；a 是 0–1 小数（与 Figma 的全 0–1 不同）。
 *
 *   get_variable_sets → { variableSets: { "<guid>": { name, ... } } }
 *   get_variables     → { variables:    { "<guid>": variable, ... } }
 *     variable.name           : "spacing/sm" 之类
 *     variable.resolvedType   : "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"
 *     variable.valuesByMode   : { "<modeId>": value }
 *     variable.variableCollectionId
 *
 * 多数鸿蒙库纯靠 Local Styles 不开 Variables，本函数对二者都兼容，缺哪份就空哪份。
 */
function normalizeTokens({ localStyles, variables, variableSets }) {
  const tokens = { color: {}, typography: {}, radius: {}, shadow: {}, spacing: {} };

  // ── 1) Local Styles ──
  for (const s of mapOrArray(localStyles, "localStyles", "styles")) {
    const name = (s.name || s.styleName || "").trim();
    if (!name) continue;
    const key = sanitizeKey(name);
    const styleType = (s.styleType || s.type || "").toUpperCase();

    if (styleType === "FILL" || s.fillPaints || s.fills) {
      const paint = (s.fillPaints || s.fills || [])[0] || s.paint;
      if (!paint || paint.visible === false) continue;
      const css = paintToCss(paint);
      if (css) tokens.color[key] = css;
    } else if (styleType === "TEXT" || s.text) {
      const ts = s.text || s.style || s.textStyle || {};
      tokens.typography[key] = {
        fontFamily: ts.fontFamily || ts.fontName?.family || null,
        fontSize: numOrNull(ts.fontSize),
        fontStyle: ts.fontStyle || null,
        fontWeight: numOrNull(ts.fontWeight),
        lineHeight: numOrNull(ts.lineHeight?.value ?? ts.lineHeight),
        letterSpacing: numOrNull(ts.letterSpacing?.value ?? ts.letterSpacing),
      };
    } else if (styleType === "EFFECT" || s.effects) {
      const eff = (s.effects || [])[0] || s.effect;
      const css = effectToCss(eff);
      if (css) tokens.shadow[key] = css;
    }
  }

  // ── 2) Variable Sets / Variables ──
  const setIdToName = new Map();
  for (const c of mapOrArray(variableSets, "variableSets", "collections")) {
    setIdToName.set(c.guid || c.id || c.key, (c.name || "").trim());
  }
  for (const v of mapOrArray(variables, "variables", "items")) {
    const name = (v.name || "").trim();
    if (!name) continue;
    const key = sanitizeKey(name);
    const collName = (setIdToName.get(v.variableCollectionId || v.collectionId || v.collection) || "").toLowerCase();
    const value = pickVariableValue(v);
    const rt = (v.resolvedType || v.type || "").toUpperCase();

    if (rt.includes("COLOR") || (value && typeof value === "object" && "r" in value)) {
      const css = paintToCss({ color: value, type: "SOLID" });
      if (css) tokens.color[key] = css;
    } else if (rt.includes("FLOAT") || rt.includes("NUMBER") || typeof value === "number") {
      const n = numOrNull(value);
      if (n == null) continue;
      const text = (name + " " + collName).toLowerCase();
      if (/radius|圆角/.test(text)) tokens.radius[key.replace(/^radius-?/, "")] = n;
      else if (/spacing|间距|gap|padding|margin/.test(text)) tokens.spacing[key.replace(/^spacing-?/, "")] = n;
      else tokens.spacing[key] = n;
    } else if (typeof value === "string" && /^\d+px|rgba|inset|drop-shadow/.test(value)) {
      tokens.shadow[key] = value;
    }
  }

  return tokens;
}

// ── 帮 normalize 取出 Pixso 那种 { wrapperKey: { guid: x, ... } } 的对象 / 兼容数组 ──
function mapOrArray(payload, ...wrapperKeys) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const k of wrapperKeys) {
    const v = payload[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      return Object.entries(v).map(([guid, item]) => ({ guid, ...item }));
    }
  }
  // payload 自己就是 { guid: item } map
  if (typeof payload === "object") {
    const vals = Object.values(payload);
    if (vals.length && typeof vals[0] === "object") return Object.entries(payload).map(([guid, item]) => ({ guid, ...item }));
  }
  return [];
}

/**
 * 规则：
 *   - "Light/font_primary" 当作浅色主题主 token，剥前缀 → "font_primary"
 *   - "Dark/font_primary"  独立保留 → "dark-font_primary"，不再覆盖 Light 版本
 *   - 其余 "/" 统一替换成 "-"
 */
function sanitizeKey(name) {
  const trimmed = name.trim();
  const isLight = /^Light\s*\/\s*/i.test(trimmed);
  const isDark  = /^Dark\s*\/\s*/i.test(trimmed);
  let body;
  if (isLight) body = trimmed.replace(/^Light\s*\/\s*/i, "");
  else if (isDark) body = "dark/" + trimmed.replace(/^Dark\s*\/\s*/i, "");
  else body = trimmed;
  return body.replace(/\s+/g, "-").replace(/\//g, "-").toLowerCase();
}

// ─────── 辅助 ───────
function numOrNull(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function isHexLike(v) {
  return typeof v === "string" && /^#?[0-9a-f]{3,8}$/i.test(v.trim());
}
function normalizeHex(s) {
  let h = s.trim().replace(/^#/, "").toUpperCase();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  return "#" + h;
}
/**
 * Pixso paint → CSS 颜色串。Pixso 颜色：r/g/b ∈ 0–255 整数，a ∈ 0–1。
 * paint 可能是 { color:{r,g,b,a}, opacity, type:"SOLID" } 或裸 {r,g,b,a}。
 */
function paintToCss(paint) {
  if (!paint) return null;
  if (typeof paint === "string" && isHexLike(paint)) return normalizeHex(paint);
  const c = paint.color || paint.value || paint;
  if (!c) return null;
  if (typeof c === "string" && isHexLike(c)) return normalizeHex(c);
  if (typeof c.r !== "number") return null;
  const r = clamp255(c.r), g = clamp255(c.g), b = clamp255(c.b);
  // alpha 优先级：c.a > paint.opacity > 1
  const a = c.a !== undefined ? c.a : (paint.opacity !== undefined ? paint.opacity : 1);
  if (a >= 0.999) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return `rgba(${r},${g},${b},${Number(a.toFixed(3))})`;
}
function clamp255(n) {
  // Pixso 通常给 0–255 整数；但若是 0–1 小数（兼容 Figma 风格），自动放大
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1 && !Number.isInteger(n)) return Math.round(n * 255);
  return Math.max(0, Math.min(255, Math.round(n)));
}
function pickVariableValue(v) {
  if (v.value !== undefined) return v.value;
  if (v.valuesByMode) {
    const k = Object.keys(v.valuesByMode);
    return k.length ? v.valuesByMode[k[0]] : null;
  }
  return null;
}
function effectToCss(eff) {
  if (!eff) return null;
  if (typeof eff === "string") return eff;
  if (eff.type && /SHADOW/i.test(eff.type)) {
    const x = eff.offset?.x || 0, y = eff.offset?.y || 0;
    const blur = eff.radius || 0, spread = eff.spread || 0;
    const colorCss = paintToCss({ color: eff.color || {}, opacity: 1 });
    return `${x}px ${y}px ${blur}px ${spread}px ${colorCss || "rgba(0,0,0,0.1)"}`;
  }
  return null;
}

module.exports = {
  SNAPSHOT_PATH,
  EMPTY_SNAPSHOT,
  read,
  write,
  exists,
  normalizeTokens,
};
