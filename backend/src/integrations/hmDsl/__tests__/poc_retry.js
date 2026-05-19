"use strict";
/**
 * PoC: 验证 patchOneStateViaDsl 在 LLM 空返回 / JSON 解析失败时正确重试。
 *
 * 用 mock callText 模拟 4 类场景：
 *   A) 第 1 次正常 → 不重试
 *   B) 第 1 次空 → 第 2 次正常
 *   C) 第 1 次 JSON 残缺到 jsonrepair 也修不好 → 第 2 次正常
 *   D) 两次都空 → 抛 "LLM 多次返回空"
 *
 * 运行：node backend/src/integrations/hmDsl/__tests__/poc_retry.js
 */

const { patchOneStateViaDsl } = require("../patchViaDsl");

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else      { fail++; console.log(`  [FAIL] ${name}`, detail || ""); }
}

const baseHtml = "<html><body><div>base</div></body></html>";
const goodDsl = JSON.stringify({
  state_name: "ok",
  lifecycle: "persistent",
  injection: { mode: "overlay", z_index: 9999 },
  tree: { type: "Text", props: { text: "hello" } },
});

// jsonrepair 也修不好的（深层结构性错乱：键名 + 引号都乱）
const brokenDsl = `{ "tree": { "type" "Text" : props { "text" } "hello" } } }`;

const cases = [
  {
    name: "A. 第 1 次正常",
    responses: [goodDsl, goodDsl],
    expectOk: true,
    expectAttempts: 1,
  },
  {
    name: "B. 第 1 次空 → 第 2 次正常",
    responses: ["", goodDsl],
    expectOk: true,
    expectAttempts: 2,
  },
  {
    name: "C. 第 1 次 JSON 烂 → 第 2 次正常",
    responses: [brokenDsl, goodDsl],
    expectOk: true,
    expectAttempts: 2,
  },
  {
    name: "D. 两次都空 → 抛错",
    responses: ["", ""],
    expectOk: false,
    expectErrMatch: /LLM 多次返回空/,
    expectAttempts: 2,
  },
  {
    name: "E. 两次 JSON 都烂 → 抛错（含修复尝试）",
    responses: [brokenDsl, brokenDsl],
    expectOk: false,
    expectErrMatch: /DSL JSON 解析失败/,
    expectAttempts: 2,
  },
];

(async () => {
  for (const c of cases) {
    let attempts = 0;
    const tempUsed = [];
    const callText = async (_sys, _user, opts) => {
      tempUsed.push(opts && opts.temperature);
      const r = c.responses[attempts];
      attempts++;
      return r;
    };
    let result = null, err = null;
    try {
      result = await patchOneStateViaDsl({
        prevHtml: baseHtml,
        currentReq: { state_id: 2, state_name: "retry-test" },
        allRequirements: [],
        llmDeps: { callText },
        log: () => {},
      });
    } catch (e) { err = e; }

    if (c.expectOk) {
      check(c.name, !!result && !err, err ? err.message : "no result");
      check(`  ${c.name} · attempts=${c.expectAttempts}`, attempts === c.expectAttempts, `actual=${attempts}`);
    } else {
      check(c.name, !!err && c.expectErrMatch.test(err.message), err ? err.message : "no err");
      check(`  ${c.name} · attempts=${c.expectAttempts}`, attempts === c.expectAttempts, `actual=${attempts}`);
    }
    // 第 2 次 temperature 必须被扰动（≠ 第 1 次）
    if (c.expectAttempts === 2) {
      check(`  ${c.name} · temperature 扰动`, tempUsed[0] !== tempUsed[1], `t=[${tempUsed.join(",")}]`);
    }
  }

  console.log(`\n=== 汇总 ===\n  PASS=${pass}  FAIL=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
