"use strict";
/**
 * Mock 端到端 PoC：用 mock LLM 模拟"返回 fixture JSON"，
 * 跑 patchOneStateViaDsl 全链路，证明 M2 路径不破坏 patchOneState 接口。
 */

const fs = require("fs");
const path = require("path");
const { patchOneStateViaDsl } = require("../patchViaDsl");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const TEST1_DIR = path.join(REPO_ROOT, "test", "1", "html 19");
const BASE_HTML = fs.readFileSync(path.join(TEST1_DIR, "Index.html"), "utf8");
const FIXTURE_DIR = path.join(__dirname, "fixtures");

async function runOne(stateId, fixtureName, currentReq) {
  const fixturePath = path.join(FIXTURE_DIR, fixtureName);
  const fixtureJson = fs.readFileSync(fixturePath, "utf8");
  // mock LLM：直接返回 fixture
  const llmDeps = {
    callText: async () => fixtureJson,
  };
  const t0 = Date.now();
  const r = await patchOneStateViaDsl({
    prevHtml: BASE_HTML,
    currentReq: { ...currentReq, state_id: stateId },
    allRequirements: [],
    log: (m) => console.log(`  state_${stateId} | ${m}`),
    assetPrefix: "_hm-assets",
    llmDeps,
  });
  console.log(`[mock-e2e] state_${stateId} OK in ${Date.now() - t0}ms · html=${r.html.length}B · applied=${r.applied}`);
  return r;
}

(async () => {
  await runOne(5, "test1_state5.json", { state_name: "Interests and Preferences页", description: "新页面", implementation_method: "" });
  await runOne(2, "test1_state2.json", { state_name: "全屏偏好选择面板", description: "弹窗", implementation_method: "" });
  await runOne(4, "test1_state4.json", { state_name: "偏好提交加载中", description: "loading", implementation_method: "" });
  console.log("[mock-e2e] PASS - patchOneStateViaDsl 端到端跑通");
})().catch(e => {
  console.error("[mock-e2e] FAIL:", e);
  process.exit(1);
});
