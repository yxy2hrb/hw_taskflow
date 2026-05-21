"use strict";

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const { screenshotHtmlString, getContext, DEFAULT_VIEWPORT } = require("./integrations/htmlScreenshot");

const ICON_LIGATURES = [
  "close",
  "check_circle",
  "arrow_back",
  "wifi",
  "qr_code",
  "error",
  "refresh",
  "pause",
  "progress_activity",
];

function normalizeCssValue(s) {
  return String(s || "").replace(/\s+/g, "").toLowerCase();
}

function validateBlueprint(bp) {
  const issues = [];
  if (!bp || typeof bp !== "object") return { ok: false, issues: ["blueprint missing"] };
  if (!bp.meta) issues.push("meta missing");
  if (!Array.isArray(bp.states) || bp.states.length < 2) issues.push("states must be >= 2");

  const ids = new Set();
  const seenByStateId = new Map();
  (bp.states || []).forEach((s, i) => {
    if (!s || typeof s !== "object") {
      issues.push(`states[${i}] must be object`);
      return;
    }
    if (typeof s.state_id !== "number") issues.push(`states[${i}].state_id must be number`);
    if (!s.state_name) issues.push(`states[${i}].state_name missing`);
    if (!s.description) issues.push(`states[${i}].description missing`);
    if (!s.implementation_method) issues.push(`states[${i}].implementation_method missing`);
    // [NOTE] implementation_method 三段式验证暂时注释，因为正则过于严格
    // 实际格式如 "基于 last_state=state_1：保留顶部状态栏；删除底部；新增内容" 无法匹配
    // 后续需要优化正则或改为更宽松的验证
    /*
    if (i > 0 && typeof s.implementation_method === "string") {
      const impl = s.implementation_method;
      const hasBase = /基于\s*last_state|based\s*on\s*last_state|last_state\s*=\s*state_\d+/i.test(impl);
      const hasKeep = /保留[:：]|keep[:：]/i.test(impl);
      const hasDelete = /删除[:：]|remove[:：]/i.test(impl);
      const hasAdd = /新增[:：]|add[:：]/i.test(impl);
      if (!(hasBase && hasKeep && hasDelete && hasAdd)) {
        issues.push(`states[${i}].implementation_method 必须显式包含"基于 last_state + 保留/删除/新增"三段式`);
      }
    }
    */
    if (typeof s.state_id === "number") {
      if (seenByStateId.has(s.state_id)) {
        issues.push(`duplicate state_id=${s.state_id} at states[${seenByStateId.get(s.state_id)}] and states[${i}]`);
      } else {
        seenByStateId.set(s.state_id, i);
      }
    }
    if (i === 0) {
      if (s.state_id !== 1) issues.push("states[0] must be state_id=1");
      if (s.last_state !== null && s.last_state !== undefined) issues.push("states[0].last_state must be null/missing");
    } else {
      if (s.last_state === null || s.last_state === undefined) {
        issues.push(`states[${i}].last_state missing`);
      } else if (!ids.has(s.last_state)) {
        issues.push(`states[${i}].last_state=${s.last_state} not in prior states`);
      }
      if (typeof s.state_id === "number" && typeof s.last_state === "number" && s.last_state >= s.state_id) {
        issues.push(`states[${i}].last_state=${s.last_state} must be smaller than state_id=${s.state_id}`);
      }
    }
    ids.add(s.state_id);
  });
  return { ok: issues.length === 0, issues };
}

function detectIconLigatureLeaks(html) {
  const issues = [];
  const iconSet = new Set(ICON_LIGATURES);
  const tagRe = /<([a-z][\w:-]*)\b([^>]*)>([^<>]{1,80})<\/\1>/gi;
  let m;
  while ((m = tagRe.exec(html || "")) !== null) {
    const attrs = m[2] || "";
    const text = String(m[3] || "").trim();
    if (!iconSet.has(text)) continue;
    const looksIcon = /\b(mi|material-icons|icon|symbol)\b/i.test(attrs);
    if (looksIcon || text !== "close") {
      issues.push(`icon ligature visible as text: "${text}"`);
    }
  }
  return Array.from(new Set(issues));
}

function detectForbiddenOverlay(html, state) {
  const text = `${state?.state_name || ""} ${state?.description || ""} ${state?.implementation_method || ""}`;
  if (!/(无遮罩|无弹窗|不要遮罩|不显示遮罩|no\s+overlay|without\s+overlay|no\s+modal|without\s+modal)/i.test(text)) {
    return [];
  }
  const normalized = normalizeCssValue(html);
  const issues = [];
  if (/rgba\(0,0,0,0\.4[0-9]*\)/i.test(normalized)) {
    issues.push("state declares no-overlay/no-modal but contains rgba(0,0,0,0.4*) mask");
  }
  if (/position:fixed;[^"]*inset:0/i.test(normalized) && /background:rgba\(0,0,0,0\.[2-8]/i.test(normalized)) {
    issues.push("state declares no-overlay/no-modal but contains full-screen fixed dark overlay");
  }
  return issues;
}

function stripHtmlComments(html) {
  return String(html || "").replace(/<!--[\s\S]*?-->/g, "");
}

function resolveAssetBase(htmlFilePath, html) {
  const htmlDir = path.dirname(htmlFilePath);
  const baseMatch = String(html || "").match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (!baseMatch) return htmlDir;
  const href = baseMatch[1];
  if (/^https?:\/\//i.test(href)) return htmlDir;
  return path.resolve(htmlDir, href);
}

function collectAssetRefs(html) {
  const refs = [];
  const withoutComments = stripHtmlComments(html);
  const attrRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let m;
  while ((m = attrRe.exec(withoutComments)) !== null) refs.push(m[1]);
  while ((m = urlRe.exec(withoutComments)) !== null) refs.push(m[1]);
  return refs.filter(ref => {
    const s = String(ref || "").trim();
    return s &&
      !/^data:/i.test(s) &&
      !/^https?:\/\//i.test(s) &&
      !/^\/\//.test(s) &&
      !/^#/.test(s) &&
      !/^(javascript|mailto):/i.test(s) &&
      !/^\{/.test(s);
  });
}

function detectMissingAssets(htmlFilePath, html) {
  const base = resolveAssetBase(htmlFilePath, html);
  const warnings = [];
  for (const ref of collectAssetRefs(html)) {
    const clean = decodeURIComponent(String(ref).split(/[?#]/)[0]);
    const abs = path.resolve(base, clean);
    if (!abs.startsWith(path.resolve(base)) && clean.startsWith("..")) {
      // Relative parent paths are valid with <base>; still check them after normalization.
    }
    if (!fs.existsSync(abs)) warnings.push(`missing asset: ${ref}`);
  }
  return Array.from(new Set(warnings));
}

async function detectViewportOverflow(html, baseDir) {
  const shot = await screenshotHtmlString(html, { baseDir, waitMs: 300, maxHeight: 4500 });
  if (!shot.ok) return { screenshot: shot, issues: [`screenshot failed: ${shot.reason}`] };

  const tmpPath = path.join(baseDir, `__quality_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.html`);
  fs.writeFileSync(tmpPath, html, "utf-8");
  let page;
  try {
    const ctx = await getContext();
    page = await ctx.context.newPage();
    await page.goto(require("url").pathToFileURL(tmpPath).href, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).catch(() => {});
    await page.waitForTimeout(200);
    const probe = await page.evaluate((viewport) => {
      const vw = viewport.width;
      const bad = [];
      function hasClippingAncestor(el, rect) {
        let parent = el.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
          const style = window.getComputedStyle(parent);
          const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
          if (/(hidden|clip|auto|scroll)/.test(overflow)) {
            const pr = parent.getBoundingClientRect();
            if (rect.left < pr.left - 1 || rect.right > pr.right + 1) return true;
          }
          parent = parent.parentElement;
        }
        return false;
      }
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const leftOverflow = Math.max(0, -r.left);
        const rightOverflow = Math.max(0, r.right - vw);
        if (leftOverflow <= 12 && rightOverflow <= 12) continue;
        if (hasClippingAncestor(el, r)) continue;

        // D2C HTML often contains side ornaments or mask fragments with negative
        // coordinates. Treat them as noise unless they are large enough to be a
        // likely primary container, or they create real horizontal scroll.
        const severe = Math.max(leftOverflow, rightOverflow) > vw * 0.25;
        const structural = r.width > vw * 0.75;
        if (severe || structural) {
          bad.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || "",
            cls: String(el.className || "").slice(0, 60),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
          if (bad.length >= 5) break;
        }
      }
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bad };
    }, DEFAULT_VIEWPORT);
    const issues = [];
    if (probe.scrollWidth > probe.clientWidth + 12) issues.push(`document horizontal overflow: ${probe.scrollWidth}px > ${probe.clientWidth}px`);
    for (const b of probe.bad || []) {
      issues.push(`element overflows viewport: <${b.tag}${b.id ? `#${b.id}` : ""}> left=${b.left} right=${b.right}`);
    }
    return { screenshot: shot, issues };
  } catch (e) {
    return { screenshot: shot, issues: [`viewport probe failed: ${e.message}`] };
  } finally {
    if (page) await page.close().catch(() => {});
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

async function writeFinalScreenshot({ html, htmlFilePath, outPath, baseDir }) {
  const shot = await screenshotHtmlString(html, { baseDir: baseDir || path.dirname(htmlFilePath), waitMs: 700, maxHeight: 4500 });
  if (shot.ok) {
    await fsp.writeFile(outPath, shot.buffer);
    return { ok: true, file: path.basename(outPath), bytes: shot.buffer.length, height: shot.height, ms: shot.ms };
  }
  return { ok: false, file: path.basename(outPath), reason: shot.reason, ms: shot.ms };
}

async function validateStateHtml({ html, htmlFilePath, state, baseDir, includeViewport = true }) {
  const issues = [];
  const assetWarnings = detectMissingAssets(htmlFilePath, html);
  issues.push(...detectIconLigatureLeaks(html));
  issues.push(...detectForbiddenOverlay(html, state));
  let viewport = null;
  if (includeViewport) {
    viewport = await detectViewportOverflow(html, baseDir || path.dirname(htmlFilePath));
    issues.push(...viewport.issues);
  }
  return {
    ok: issues.length === 0 && assetWarnings.length === 0,
    issues,
    assetWarnings,
    viewportScreenshotOk: viewport?.screenshot?.ok ?? null,
  };
}

module.exports = {
  ICON_LIGATURES,
  validateBlueprint,
  validateStateHtml,
  writeFinalScreenshot,
  detectIconLigatureLeaks,
  detectForbiddenOverlay,
  detectMissingAssets,
};
