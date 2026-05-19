"use strict";
/**
 * 批量 PoC: 按 last_state 链路编译 test/1 全部 6 个 state（state_1 base + 5 个 DSL 编译）。
 *
 * 用法：
 *   node backend/src/integrations/hmDsl/__tests__/poc_test1_all.js
 *
 * 输出：
 *   test/1/html 19/_dsl_poc_state_{N}.html      # 编译产物（含资源相对路径）
 *   backend/src/integrations/hmDsl/__tests__/output/state_{N}.compiled.png  # 截图
 *   backend/src/integrations/hmDsl/__tests__/output/poc_report.json         # DOM probe + 体积对比
 */

const fs = require("fs");
const path = require("path");
const { compileTree } = require("../compile");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const FIXTURE_DIR = path.join(__dirname, "fixtures");
const OUT_DIR = path.join(__dirname, "output");
fs.mkdirSync(OUT_DIR, { recursive: true });

const TEST1_DIR = path.join(REPO_ROOT, "test", "1", "html 19");
const BASE_HTML_PATH = path.join(TEST1_DIR, "Index.html");

// state_id → fixture（state_1 是 base 本身，没有 fixture）
const PLAN = [
  { state_id: 1, last_state: null, fixture: null,             title: "行业资讯页带全部页签（base）" },
  { state_id: 2, last_state: 1,    fixture: "test1_state2.json", title: "全屏偏好选择面板" },
  { state_id: 3, last_state: 2,    fixture: "test1_state3.json", title: "空选择警告提示" },
  { state_id: 4, last_state: 2,    fixture: "test1_state4.json", title: "偏好提交加载中" },
  { state_id: 5, last_state: 1,    fixture: "test1_state5.json", title: "Interests and Preferences页" },
  { state_id: 6, last_state: 1,    fixture: "test1_state6.json", title: "资讯页返回带红点提示" },
];

const baseHtml = fs.readFileSync(BASE_HTML_PATH, "utf8");

// 编译每个 state（state_1 直接使用 base）
const compiled = { 1: baseHtml };
const reports = [];

for (const p of PLAN) {
  if (p.state_id === 1) {
    reports.push({ state_id: 1, title: p.title, html_bytes: baseHtml.length, action: "use base" });
    continue;
  }
  const lineageHtml = compiled[p.last_state] || baseHtml;
  const fixturePath = path.join(FIXTURE_DIR, p.fixture);
  if (!fs.existsSync(fixturePath)) {
    console.error(`[poc] fixture not found: ${fixturePath}`);
    process.exit(1);
  }
  const root = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const t0 = Date.now();
  let out;
  try {
    out = compileTree(root, lineageHtml, { stateId: p.state_id, log: () => {} });
  } catch (e) {
    console.error(`[poc] compile state_${p.state_id} failed: ${e.message}`);
    reports.push({ state_id: p.state_id, title: p.title, error: e.message });
    continue;
  }
  const dt = Date.now() - t0;
  compiled[p.state_id] = out.html;

  const inplace = path.join(TEST1_DIR, `_dsl_poc_state_${p.state_id}.html`);
  fs.writeFileSync(inplace, out.html, "utf8");
  console.log(`[poc] state_${p.state_id} compiled in ${dt}ms → ${path.basename(inplace)} (${out.html.length}B; from last_state=${p.last_state})`);
  reports.push({
    state_id: p.state_id,
    title: p.title,
    last_state: p.last_state,
    html_bytes: out.html.length,
    compile_ms: dt,
    warnings: out.warnings || [],
  });
}

// Playwright 截图
(async () => {
  let playwright;
  try { playwright = require("playwright"); } catch (_) {
    console.log("[poc] playwright 未安装，跳过截图");
    fs.writeFileSync(path.join(OUT_DIR, "poc_report.json"), JSON.stringify(reports, null, 2), "utf8");
    return;
  }
  const browser = await playwright.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });

    for (const r of reports) {
      const sid = r.state_id;
      const htmlPath = sid === 1
        ? BASE_HTML_PATH
        : path.join(TEST1_DIR, `_dsl_poc_state_${sid}.html`);
      const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
      const page = await ctx.newPage();
      await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);  // 等字体/CSS
      const screenshotPath = path.join(OUT_DIR, `state_${sid}.compiled.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      r.screenshot = screenshotPath;

      const probe = await page.evaluate(() => {
        const dsl = document.querySelector('[data-hm-dsl="1"]');
        const cards = document.querySelectorAll('[data-hm="IconCard"]').length;
        const lists = document.querySelectorAll('[data-hm="ListItem"]').length;
        const banner = !!document.querySelector('[data-hm="Banner"]');
        const spinner = !!document.querySelector('[data-hm="Spinner"]');
        const overlay = !!document.querySelector('[data-hm="OverlayMask"]');
        const badge = !!document.querySelector('[data-hm="Badge"]');
        const grid = document.querySelector('[data-hm="Grid"]');
        const gridCols = grid ? getComputedStyle(grid).gridTemplateColumns : null;
        return { dsl_exists: !!dsl, dsl_z: dsl ? getComputedStyle(dsl).zIndex : null,
                 cards, lists, banner, spinner, overlay, badge, gridCols };
      });
      r.dom = probe;
      console.log(`[poc] state_${sid} screenshot ${screenshotPath} probe=${JSON.stringify(probe)}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, "poc_report.json"), JSON.stringify(reports, null, 2), "utf8");
  console.log("[poc] report written:", path.join(OUT_DIR, "poc_report.json"));
})().catch(e => {
  console.error("[poc] FATAL:", e);
  process.exit(1);
});
