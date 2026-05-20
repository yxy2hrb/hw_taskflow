#!/usr/bin/env node
"use strict";

/**
 * 评估已有 taskflow 输出目录。
 * 用法: node scripts/evaluate_taskflow.js new_test/2_4/html/_taskflow_xxx
 */

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const {
  validateBlueprint,
  validateStateHtml,
  writeFinalScreenshot,
} = require("../backend/src/taskflowQuality");
const { closeScreenshotBrowser } = require("../backend/src/integrations/htmlScreenshot");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function sortStateFiles(files) {
  return files
    .filter(f => /^state_\d+\.html$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}

async function main() {
  const taskflowDir = process.argv[2];
  if (!taskflowDir) {
    console.error("用法: node scripts/evaluate_taskflow.js <taskflow_dir>");
    process.exit(1);
  }

  const absDir = path.resolve(taskflowDir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`目录不存在: ${absDir}`);
    process.exit(1);
  }

  const blueprintPath = path.join(absDir, "blueprint.json");
  const manifestPath = path.join(absDir, "manifest.json");
  const blueprint = fs.existsSync(blueprintPath) ? readJSON(blueprintPath) : null;
  const manifest = fs.existsSync(manifestPath) ? readJSON(manifestPath) : null;
  const bpValidation = validateBlueprint(blueprint);
  const manifestStates = new Map((manifest?.states || []).map(s => [Number(s.state_id), s]));
  const blueprintStates = new Map((blueprint?.states || []).map(s => [Number(s.state_id), s]));

  const stateFiles = sortStateFiles(fs.readdirSync(absDir));
  const results = [];
  for (const file of stateFiles) {
    const stateId = Number(file.match(/state_(\d+)\.html/)[1]);
    const htmlPath = path.join(absDir, file);
    const html = fs.readFileSync(htmlPath, "utf-8");
    const state = manifestStates.get(stateId) || blueprintStates.get(stateId) || { state_id: stateId };
    const finalName = `state_${stateId}_final.png`;
    const finalPath = path.join(absDir, finalName);

    let finalScreenshot = { ok: fs.existsSync(finalPath), file: finalName };
    if (!finalScreenshot.ok || process.argv.includes("--refresh-screenshots")) {
      finalScreenshot = await writeFinalScreenshot({
        html,
        htmlFilePath: htmlPath,
        outPath: finalPath,
        baseDir: absDir,
      });
    }

    const validation = await validateStateHtml({
      html,
      htmlFilePath: htmlPath,
      state,
      baseDir: absDir,
      includeViewport: true,
    });

    const reviewOk = manifestStates.get(stateId)?.reviewOk ?? manifestStates.get(stateId)?.review_ok ?? null;
    const reviewIssues = manifestStates.get(stateId)?.reviewIssues || manifestStates.get(stateId)?.review_issues || [];
    results.push({
      state_id: stateId,
      file,
      finalScreenshotOk: finalScreenshot.ok,
      finalScreenshot: finalScreenshot.ok ? finalName : null,
      reviewOk,
      reviewIssues,
      validationOk: validation.ok,
      validationIssues: validation.issues,
      assetWarnings: validation.assetWarnings,
    });
  }

  const report = {
    dir: absDir,
    blueprint: bpValidation,
    blueprintIntentReview: manifest?.blueprintIntentReview || null,
    blueprintIntentRisk: !!manifest?.blueprintIntentRisk,
    states: results,
    ok: bpValidation.ok && results.every(r => r.finalScreenshotOk && r.validationOk && r.reviewOk !== false),
  };

  await fsp.writeFile(path.join(absDir, "quality_report.json"), JSON.stringify(report, null, 2), "utf-8");

  console.log(`blueprint: ${bpValidation.ok ? "ok" : "invalid"}`);
  for (const issue of bpValidation.issues) console.log(`  - ${issue}`);
  if (report.blueprintIntentReview) {
    console.log(`blueprint intent: score=${report.blueprintIntentReview.score} decision=${report.blueprintIntentReview.decision}`);
    for (const issue of report.blueprintIntentReview.majorIssues || []) console.log(`  - major: ${issue}`);
    for (const issue of report.blueprintIntentReview.minorIssues || []) console.log(`  - minor: ${issue}`);
  }
  for (const r of results) {
    const status = r.finalScreenshotOk && r.validationOk && r.reviewOk !== false ? "ok" : "fail";
    console.log(`state_${r.state_id}: ${status} screenshot=${r.finalScreenshotOk ? "ok" : "missing"} review=${r.reviewOk}`);
    for (const issue of r.validationIssues) console.log(`  - ${issue}`);
    for (const issue of r.assetWarnings) console.log(`  - ${issue}`);
    for (const issue of r.reviewIssues) console.log(`  - review: ${issue}`);
  }
  console.log(`report: ${path.join(absDir, "quality_report.json")}`);
  if (!report.ok) process.exitCode = 2;
}

main()
  .finally(() => closeScreenshotBrowser())
  .catch(e => {
  console.error(e);
  process.exit(1);
  });
