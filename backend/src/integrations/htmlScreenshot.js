"use strict";
/**
 * Backend 内嵌 Playwright 截图工具。
 *
 * 设计要点：
 *   - 浏览器单例（lazy）：第一次调用时启动 chromium，进程退出时关闭；
 *     避免每次截图都付 1-2s 的启动开销。
 *   - 360×780 鸿蒙手机视口；fullPage 截图会自动按 scrollHeight 扩高。
 *   - 等 networkidle + fonts.ready + 一点缓冲，确保 _hm-assets 字体加载完。
 *   - 失败仅返回 ok=false，不抛异常，方便上层兜底。
 *
 * 用法：
 *   const { screenshotHtmlString } = require("./integrations/htmlScreenshot");
 *   const r = await screenshotHtmlString(htmlString, { baseDir: "/abs/dir" });
 *   if (r.ok) fs.writeFileSync("out.png", r.buffer);
 */

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const playwright = require("playwright");

const DEFAULT_VIEWPORT = { width: 360, height: 780 };

let _browser = null;
let _context = null;
let _closing = false;

async function getContext(viewport = DEFAULT_VIEWPORT) {
  if (_browser && _context) return { browser: _browser, context: _context, viewport };
  _browser = await playwright.chromium.launch({ headless: true });
  _context = await _browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (Linux; Android 13; HarmonyOS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
  });
  // 进程退出时自动清理
  if (!_closing) {
    _closing = true;
    const cleanup = async () => {
      try { if (_context) await _context.close(); } catch {}
      try { if (_browser) await _browser.close(); } catch {}
    };
    process.once("exit", cleanup);
    process.once("SIGINT", () => { cleanup().finally(() => process.exit(130)); });
    process.once("SIGTERM", () => { cleanup().finally(() => process.exit(143)); });
  }
  return { browser: _browser, context: _context, viewport };
}

/**
 * 对一个 HTML 字符串截图。
 *  - 如果 baseDir 提供，使用 page.setContent + page.route("**", ...) 拦截相对路径
 *    可能比较复杂；这里采取更简单的方案：先把 HTML 写入 baseDir/_screenshot_tmp.html，
 *    用 file:// URL 加载，截完后删除。这样 <img src="image.png"> 等相对资源能正确解析。
 *
 * @param {string} html
 * @param {object} opts
 * @param {string} opts.baseDir   把临时 html 放进这个目录，让相对资源能找到
 * @param {number} opts.maxHeight fullPage 时最大高度（默认 4500）
 * @param {number} opts.waitMs    渲染稳定后等待（默认 600ms）
 * @returns {Promise<{ ok: boolean, buffer?: Buffer, height?: number, ms?: number, reason?: string }>}
 */
async function screenshotHtmlString(html, opts = {}) {
  if (typeof html !== "string" || !html.trim()) return { ok: false, reason: "empty html" };
  const baseDir = opts.baseDir && fs.existsSync(opts.baseDir) ? opts.baseDir : null;
  const tmpName = `__screenshot_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.html`;
  const tmpPath = baseDir ? path.join(baseDir, tmpName) : path.join(require("os").tmpdir(), tmpName);

  fs.writeFileSync(tmpPath, html, "utf-8");
  const url = pathToFileURL(tmpPath).href;
  const t0 = Date.now();
  let page;
  try {
    const ctx = await getContext();
    page = await ctx.context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).catch(() => {});
    await page.waitForTimeout(opts.waitMs ?? 600);

    const docInfo = await page.evaluate(() => ({
      scrollH: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
      clientH: document.documentElement.clientHeight,
    })).catch(() => ({ scrollH: 0, clientH: 0 }));

    const maxH = opts.maxHeight ?? 4500;
    const targetH = Math.min(Math.max(docInfo.scrollH || 0, docInfo.clientH || 0, 780), maxH);
    if (targetH > DEFAULT_VIEWPORT.height) {
      await page.setViewportSize({ width: DEFAULT_VIEWPORT.width, height: targetH });
      await page.waitForTimeout(150);
    }

    const buffer = await page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
    return { ok: true, buffer, height: targetH, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, reason: e.message, ms: Date.now() - t0 };
  } finally {
    if (page) await page.close().catch(() => {});
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

module.exports = { screenshotHtmlString, getContext, DEFAULT_VIEWPORT };
