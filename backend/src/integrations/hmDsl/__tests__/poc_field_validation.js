"use strict";
/**
 * PoC: 行内字段校验补强验证。
 *
 * 跑 3 个子测：
 *   1) FormField + FieldError + Row + TextInput 编译是否输出预期 DOM
 *   2) repairLooseJson 是否能修复 5 类常见 LLM JSON 错
 *   3) 端到端：模拟 LLM 返回（含错的）DSL → parseDslResponse → compileTree
 *
 * 运行：
 *   node backend/src/integrations/hmDsl/__tests__/poc_field_validation.js
 *
 * 退出码：
 *   0 = 全部通过
 *   1 = 至少有一项失败
 */

const fs = require("fs");
const path = require("path");
const { compileTree } = require("../compile");
const { parseDslResponse } = require("../skill");

const OUT_DIR = path.join(__dirname, "output");
fs.mkdirSync(OUT_DIR, { recursive: true });

let pass = 0, fail = 0;

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else      { fail++; console.log(`  [FAIL] ${name}`, detail || ""); }
}

// ============= 1. 组件编译 =============
console.log("\n=== 1. 组件编译 ===");

const baseHtml = "<html><body><div>base</div></body></html>";

const dslFormField = {
  state_name: "测试_行内校验",
  lifecycle: "persistent",
  injection: { mode: "overlay", z_index: 9999 },
  inherit_skeleton: false,
  tree: {
    type: "Page",
    props: { background: "#FFFFFF" },
    children: [
      { type: "StatusBar" },
      { type: "NavBar", props: { title: "注册" } },
      { type: "Column", props: { gap: 16, padding: 16 }, children: [
        { type: "FormField", props: { label: "手机号", required: true, value: "138", error: "手机号格式不正确" } },
        { type: "FormField", props: { label: "验证码", required: true, placeholder: "请输入" } },
        { type: "Row", props: { gap: 8, justify: "space-between" }, children: [
          { type: "Button", props: { label: "取消", variant: "secondary" } },
          { type: "Button", props: { label: "下一步", variant: "primary" } },
        ]},
      ]},
    ],
  },
};

const { html: htmlA, warnings: warnA } = compileTree(dslFormField, baseHtml, { stateId: 99 });
fs.writeFileSync(path.join(OUT_DIR, "field_validation.compiled.html"), htmlA, "utf8");
check("FormField 节点存在", /data-hm="FormField"/.test(htmlA));
check("两个 FormField", (htmlA.match(/data-hm="FormField"/g) || []).length === 2);
check("error 文本出现「手机号格式不正确」", htmlA.includes("手机号格式不正确"));
check("FieldError 节点存在（FormField 自动渲染）", /data-hm="FieldError"/.test(htmlA));
check("Row 节点存在", /data-hm="Row"/.test(htmlA));
check("Row 是 flex-direction:row", /flex-direction:row/.test(htmlA));
check("invalid TextInput 边框红（warning #E84026）", /TextInput[^"]*"[^>]*#E84026/.test(htmlA) || /#E84026/.test(htmlA));
check("compile 无 error warnings", !warnA || warnA.length === 0, warnA);

// FieldError 独立测试
const dslFieldError = {
  state_name: "独立错误提示",
  lifecycle: "temporary",
  injection: { mode: "overlay", z_index: 9999 },
  tree: {
    type: "FieldError",
    props: { text: "请填写必填项" },
  },
};
const { html: htmlB } = compileTree(dslFieldError, baseHtml, { stateId: 100 });
check("独立 FieldError 渲染", htmlB.includes("请填写必填项") && /data-hm="FieldError"/.test(htmlB));
check("FieldError 默认带 error 图标", /class="mi"[^>]*>error</.test(htmlB));

// ============= 2. JSON 修复 =============
console.log("\n=== 2. JSON 修复（5 类 LLM 错） ===");

const cases = [
  {
    name: "末尾多余逗号",
    raw: `{"a":1, "b":2,}`,
    expect: o => o.a === 1 && o.b === 2,
  },
  {
    name: "对象之间漏逗号",
    raw: `{"a":1 "b":2}`,
    expect: o => o.a === 1 && o.b === 2,
  },
  {
    name: "数组元素之间漏逗号",
    raw: `{"items":[{"x":1} {"x":2}]}`,
    expect: o => Array.isArray(o.items) && o.items.length === 2 && o.items[1].x === 2,
  },
  {
    name: "未引号 key",
    raw: `{a: 1, b: "hi"}`,
    expect: o => o.a === 1 && o.b === "hi",
  },
  {
    name: "JS 单行注释",
    raw: `{
      // this is a comment
      "a": 1, // trailing comment
      "b": 2
    }`,
    expect: o => o.a === 1 && o.b === 2,
  },
  {
    name: "未闭合的 } 和 ]",
    raw: `{"tree":{"type":"Column","children":[{"type":"Text","props":{"text":"hi"}`,
    expect: o => o.tree && o.tree.type === "Column",
  },
  {
    name: "深层嵌套 + 中段漏逗号 + 末尾未闭",
    raw: `{"tree":{"type":"Column"
      "children":[
        {"type":"FormField","props":{"label":"手机号"
          "error":"格式错误"}}`,
    expect: o => o.tree.type === "Column"
      && Array.isArray(o.tree.children)
      && o.tree.children[0].props.label === "手机号",
  },
];

for (const c of cases) {
  let got = null, err = null;
  try { got = parseDslResponse(c.raw); } catch (e) { err = e.message; }
  if (err) check(c.name, false, `parse 失败: ${err}`);
  else check(c.name, c.expect(got), `got = ${JSON.stringify(got)}`);
}

// ============= 3. 端到端：模拟 LLM 残缺输出 + 编译 =============
console.log("\n=== 3. 端到端：LLM 残缺输出 → parseDslResponse → compileTree ===");

const llmRaw = `\`\`\`json
{
  "state_name": "校验失败反馈态"
  "lifecycle": "persistent",
  "injection": { "mode": "overlay", "z_index": 9999 },
  "inherit_skeleton": false,
  "tree": {
    "type": "Page",
    "props": { "background": "#FFFFFF" },
    "children": [
      { "type": "StatusBar" }
      { "type": "NavBar", "props": { "title": "注册" } },
      { "type": "Column", "props": { "gap": 16, "padding": 16 }, "children": [
        { "type": "FormField", "props": { "label": "手机号", "required": true, "error": "格式错误" } }
        { "type": "FormField", "props": { "label": "验证码", "required": true } },
      ]}
    ]
  }
}
\`\`\``;

let parsed = null, parseErr = null;
try { parsed = parseDslResponse(llmRaw); } catch (e) { parseErr = e.message; }
check("LLM 残缺 raw 能修复并 parse", !!parsed, parseErr);

if (parsed) {
  let html = null, compErr = null;
  try {
    const r = compileTree(parsed, baseHtml, { stateId: 999 });
    html = r.html;
  } catch (e) { compErr = e.message; }
  check("修复后能编译", !!html, compErr);
  if (html) {
    check("编译产物含 FormField", /data-hm="FormField"/.test(html));
    check("编译产物含「手机号」", html.includes("手机号"));
    check("编译产物含「格式错误」", html.includes("格式错误"));
    fs.writeFileSync(path.join(OUT_DIR, "field_validation_e2e.compiled.html"), html, "utf8");
  }
}

// ============= 4. 截图（可选） =============
(async () => {
  let playwright;
  try { playwright = require("playwright"); } catch (_) {
    console.log("\n[skip] playwright 未安装，跳过截图");
    finish();
    return;
  }

  // 把组件1的产物放到 test/1/html 19/ 下复用字体资源
  const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
  const TEST1_DIR = path.join(REPO_ROOT, "test", "1", "html 19");
  if (!fs.existsSync(TEST1_DIR)) {
    console.log("\n[skip] test/1 资源不存在，跳过截图");
    finish();
    return;
  }
  const baseRealHtml = fs.readFileSync(path.join(TEST1_DIR, "Index.html"), "utf8");
  const { html: htmlReal } = compileTree(dslFormField, baseRealHtml, { stateId: 99 });
  const inplaceOut = path.join(TEST1_DIR, "_dsl_poc_field_validation.html");
  fs.writeFileSync(inplaceOut, htmlReal, "utf8");

  console.log("\n=== 4. 截图 ===");
  const browser = await playwright.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    const fileUrl = "file:///" + inplaceOut.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const shotPath = path.join(OUT_DIR, "field_validation.compiled.png");
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("  [shot]", shotPath);

    const probe = await page.evaluate(() => {
      const fields = document.querySelectorAll('[data-hm="FormField"]');
      const errs = document.querySelectorAll('[data-hm="FieldError"]');
      const inputs = document.querySelectorAll('[data-hm="TextInput"]');
      const invalidBordered = Array.from(inputs).filter(el =>
        /E84026/i.test(el.outerHTML)).length;
      return {
        formfields: fields.length,
        field_errors: errs.length,
        inputs: inputs.length,
        invalid_bordered: invalidBordered,
      };
    });
    console.log("  [dom]", probe);
    check("DOM: 2 个 FormField", probe.formfields === 2);
    check("DOM: 1 个 FieldError（仅 error 字段会渲染）", probe.field_errors === 1);
    check("DOM: 1 个 invalid 红边输入框", probe.invalid_bordered === 1);
  } finally {
    await browser.close();
  }

  finish();
})();

function finish() {
  console.log("\n=== 汇总 ===");
  console.log(`  PASS=${pass}  FAIL=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}
