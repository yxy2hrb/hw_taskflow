"use strict";
/**
 * PoC: 验证 anchor 失败回落 top-banner 的视觉效果。
 *   1) FieldError + append + 不存在 anchor → 顶部浅红 banner 卡片
 *   2) Banner + append + 不存在 anchor → 顶部红 banner（无双层卡片）
 *   3) Text "操作成功" + append + 不存在 anchor → 顶部白色信息卡
 */

const fs = require("fs");
const path = require("path");
const { compileTree } = require("../compile");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const TEST1_DIR = path.join(REPO_ROOT, "test", "1", "html 19");
const OUT_DIR = path.join(__dirname, "output");
fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(TEST1_DIR)) {
  console.log("[skip] test/1 资源不存在");
  process.exit(0);
}

const baseHtml = fs.readFileSync(path.join(TEST1_DIR, "Index.html"), "utf8");

const cases = [
  {
    name: "anchor_fail_fielderror",
    dsl: {
      state_name: "字段校验失败",
      lifecycle: "temporary",
      injection: { mode: "append", anchor: "#不存在-name-field", z_index: 9999 },
      tree: { type: "FieldError", props: { text: "项目名称不能为空" } },
    },
  },
  {
    name: "anchor_fail_banner",
    dsl: {
      state_name: "Banner anchor 失败",
      lifecycle: "temporary",
      injection: { mode: "append", anchor: "#不存在-input", z_index: 9999 },
      tree: { type: "Banner", props: { text: "创建失败，请重试", variant: "warning" } },
    },
  },
  {
    name: "anchor_fail_text",
    dsl: {
      state_name: "Text anchor 失败",
      lifecycle: "temporary",
      injection: { mode: "append", anchor: "#不存在-btn", z_index: 9999 },
      tree: { type: "Text", props: { text: "操作成功", variant: "body" } },
    },
  },
];

(async () => {
  for (const c of cases) {
    const { html, warnings } = compileTree(c.dsl, baseHtml, {
      stateId: 99,
      log: m => console.log(`  [${c.name}]`, m),
    });
    const outFile = path.join(TEST1_DIR, `_dsl_poc_fallback_${c.name}.html`);
    fs.writeFileSync(outFile, html, "utf8");
    console.log(`  [${c.name}] html ${html.length}B → ${outFile}`);
  }

  let playwright;
  try { playwright = require("playwright"); } catch (_) { console.log("[skip] no playwright"); return; }
  const browser = await playwright.chromium.launch();
  try {
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
      const page = await ctx.newPage();
      const url = "file:///" + path.join(TEST1_DIR, `_dsl_poc_fallback_${c.name}.html`).replace(/\\/g, "/");
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const shot = path.join(OUT_DIR, `fallback_${c.name}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log("  shot:", shot);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
