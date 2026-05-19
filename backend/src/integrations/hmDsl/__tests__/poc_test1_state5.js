"use strict";
/**
 * PoC: 用 test/1 state_5 的 dsl_tree 编译出 HTML，并落盘 + 截图（如 playwright 可用）。
 *
 * 运行：
 *   node backend/src/integrations/hmDsl/__tests__/poc_test1_state5.js
 *
 * 输出：
 *   backend/src/integrations/hmDsl/__tests__/output/state_5.compiled.html
 *   backend/src/integrations/hmDsl/__tests__/output/state_5.compiled.png   (playwright 可用时)
 */

const fs = require("fs");
const path = require("path");
const { compileTree } = require("../compile");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");  // .../p2p
const FIXTURE_DIR = path.join(__dirname, "fixtures");
const OUT_DIR = path.join(__dirname, "output");
fs.mkdirSync(OUT_DIR, { recursive: true });

const TEST1_DIR = path.join(REPO_ROOT, "test", "1", "html 19");
const BASE_HTML_PATH = path.join(TEST1_DIR, "Index.html");
const DSL_TREE_PATH = path.join(FIXTURE_DIR, "test1_state5.json");

async function main() {
  console.log("[poc] repo_root:", REPO_ROOT);
  console.log("[poc] base_html:", BASE_HTML_PATH);
  console.log("[poc] dsl_tree :", DSL_TREE_PATH);

  if (!fs.existsSync(BASE_HTML_PATH)) {
    console.error("[poc] base HTML 不存在");
    process.exit(1);
  }
  if (!fs.existsSync(DSL_TREE_PATH)) {
    console.error("[poc] dsl_tree fixture 不存在");
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(BASE_HTML_PATH, "utf8");
  const root = JSON.parse(fs.readFileSync(DSL_TREE_PATH, "utf8"));

  const t0 = Date.now();
  const { html, warnings } = compileTree(root, baseHtml, {
    stateId: 5,
    log: (m) => console.log("  ", m),
  });
  console.log(`[poc] compile in ${Date.now() - t0}ms, output ${html.length}B`);
  if (warnings && warnings.length) {
    console.log("[poc] warnings:", warnings);
  }

  const outHtml = path.join(OUT_DIR, "state_5.compiled.html");
  fs.writeFileSync(outHtml, html, "utf8");
  console.log("[poc] html written:", outHtml);

  // 把 base 的 _hm-assets 复制 / 链接到输出目录，便于截图加载字体
  // 简化处理：把输出 html 直接放在 test/1/html 19/ 目录里，复用相对资源
  const inlineOut = path.join(TEST1_DIR, "_dsl_poc_state5.html");
  fs.writeFileSync(inlineOut, html, "utf8");
  console.log("[poc] html also written (in-place for assets):", inlineOut);

  // 试 playwright 截图
  let playwright;
  try { playwright = require("playwright"); } catch (_) {
    console.log("[poc] playwright 未安装，跳过截图");
    return;
  }
  const browser = await playwright.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    const fileUrl = "file:///" + inlineOut.replace(/\\/g, "/");
    console.log("[poc] navigate:", fileUrl);
    await page.goto(fileUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const screenshotPath = path.join(OUT_DIR, "state_5.compiled.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("[poc] screenshot:", screenshotPath);

    // 抽取 DOM 关键指标做 sanity check
    const probe = await page.evaluate(() => {
      const dsl = document.querySelector('[data-hm-dsl="1"]');
      const grid = document.querySelector('[data-hm="Grid"]');
      const cards = document.querySelectorAll('[data-hm="IconCard"]');
      const tabs = document.querySelectorAll('[data-hm="SegmentedTabs"]');
      const navBar = document.querySelector('[data-hm="NavBar"]');
      const statusBar = document.querySelector('[data-hm="StatusBar"]');
      return {
        dsl_exists: !!dsl,
        dsl_z_index: dsl ? getComputedStyle(dsl).zIndex : null,
        grid_exists: !!grid,
        grid_template_columns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
        cards_count: cards.length,
        tabs_count: tabs.length,
        nav_bar_text: navBar ? navBar.innerText.trim() : null,
        status_bar_exists: !!statusBar,
      };
    });
    console.log("[poc] dom probe:", probe);

    const ok = probe.dsl_exists
      && probe.grid_exists
      && probe.cards_count === 6
      && /repeat\s*\(\s*3/.test(probe.grid_template_columns || "")
        || (probe.grid_template_columns || "").split(" ").length === 3;

    if (ok) console.log("[poc] PASS - 关键 DOM 结构正确");
    else console.log("[poc] WARN - DOM 结构与期望不完全一致，请人工查截图");
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("[poc] FAIL:", err);
  process.exit(1);
});
