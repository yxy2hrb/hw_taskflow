#!/usr/bin/env node
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawnSync } = require("child_process");
const { injectStateKeyNavIntoFile } = require("./inject_state_key_nav");

const ROOT = path.resolve(__dirname, "../../../..");
const SKILL_ROOT = path.resolve(__dirname, "..");
const PREPROCESS_DIR = path.join(SKILL_ROOT, "sub-skills", "preprocess");
const BLUEPRINT_DIR = path.join(SKILL_ROOT, "sub-skills", "blueprint");

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function exists(file) {
  return fs.existsSync(file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readUtf8(file) {
  return fs.readFileSync(file, "utf8");
}

function readPngSize(file) {
  if (!file || !exists(file)) return null;
  const buf = fs.readFileSync(file);
  if (buf.length < 24) return null;
  const signature = buf.slice(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function argValue(args, name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
}

function resolveCodegenDir(name) {
  const allowed = new Set(["codegen", "code_gen2"]);
  if (!allowed.has(name)) throw new Error(`Invalid --codegen ${name}. Expected codegen or code_gen2.`);
  const dir = path.join(SKILL_ROOT, "sub-skills", name);
  if (!exists(dir)) throw new Error(`Missing codegen skill directory: ${dir}`);
  return dir;
}

function stamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

function resolveHtml(inputDir) {
  const candidates = [
    path.join(inputDir, "html", "Index.original.html"),
    path.join(inputDir, "html", "Index.html"),
    path.join(inputDir, "html", "index.html"),
  ];
  const hit = candidates.find(exists);
  if (!hit) throw new Error("Missing source HTML. Expected html/Index.original.html.");
  return hit;
}

function resolveInput(inputDir) {
  const candidates = [
    path.join(inputDir, "input.txt"),
    path.join(inputDir, "html", "input.txt"),
  ];
  const hit = candidates.find(exists);
  if (!hit) throw new Error("Missing input brief. Expected input.txt or html/input.txt.");
  return hit;
}

function nodeEnv() {
  const backendNodeModules = path.join(ROOT, "backend", "node_modules");
  const parts = [process.env.NODE_PATH, exists(backendNodeModules) ? backendNodeModules : ""].filter(Boolean);
  return {
    ...process.env,
    NODE_PATH: [...new Set(parts)].join(path.delimiter),
  };
}

function loadDotEnv(file) {
  if (!exists(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] == null) process.env[match[1]] = value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runNode(args, label, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[taskflow-llm-pagegen] ${label}${attempt > 1 ? ` (retry ${attempt})` : ""}`);
    const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit", env: nodeEnv() });
    if (result.status === 0) return;
    if (attempt < maxAttempts) await sleep(attempt * 5000);
    else throw new Error(`${label} failed with exit ${result.status}`);
  }
}

function latestPhaseDir(inputDir, model, phaseSuffix) {
  const htmlDir = path.join(inputDir, "html");
  const dirs = fs.readdirSync(htmlDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`_run_skills_${model}_`) && entry.name.endsWith(phaseSuffix))
    .map((entry) => path.join(htmlDir, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return dirs[0];
}

async function copyDir(source, dest) {
  await fsp.rm(dest, { recursive: true, force: true });
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.cp(source, dest, { recursive: true });
}

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((arg) => !arg.startsWith("--"));
  const htmlArg = argValue(args, "--html", "");
  const imageArg = argValue(args, "--image", "");
  const inputArg = argValue(args, "--input", "");
  if (!targetArg && (!htmlArg || !inputArg)) {
    throw new Error("Usage: node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js <inputDir> [--image image.png] [--html Index.original.html] [--input input.txt] [--width W --height H] [--codegen codegen|code_gen2]");
  }

  loadDotEnv(path.join(SKILL_ROOT, ".env"));
  loadDotEnv(path.join(ROOT, "backend", ".env"));
  const inputDir = path.resolve(ROOT, targetArg || path.dirname(path.dirname(path.resolve(ROOT, htmlArg))));
  const model = argValue(args, "--model", "qwen3.7-max");
  const codegenName = argValue(args, "--codegen", "codegen");
  const codegenDir = resolveCodegenDir(codegenName);
  const codegenPrefix = codegenName === "code_gen2" ? "code_gen2_" : "";
  const imagePath = imageArg ? path.resolve(ROOT, imageArg) : "";
  const inferredSize = readPngSize(imagePath);
  const width = argValue(args, "--width", inferredSize ? String(inferredSize.width) : "360");
  const height = argValue(args, "--height", inferredSize ? String(inferredSize.height) : "792");
  const runStamp = argValue(args, "--stamp", stamp());
  const runDir = path.join(inputDir, ".run_skill", runStamp);
  const htmlPath = htmlArg ? path.resolve(ROOT, htmlArg) : resolveHtml(inputDir);
  const inputPath = inputArg ? path.resolve(ROOT, inputArg) : resolveInput(inputDir);
  await fsp.mkdir(runDir, { recursive: true });
  writeJson(path.join(runDir, "input_manifest.json"), {
    image_path: imagePath ? rel(imagePath) : null,
    html_path: rel(htmlPath),
    input_txt_path: rel(inputPath),
    codegen: codegenName,
    viewport: {
      width: Number(width),
      initial_height: Number(height),
      width_locked: true,
      height_may_expand: true,
    },
  });

  const report = {
    ok: false,
    input_dir: rel(inputDir),
    model,
    codegen: codegenName,
    stamp: runStamp,
    outputs: {},
    checks: {},
  };

  const preprocessOut = path.join(runDir, "preprocess");
  const preprocessArgs = [
    path.join(PREPROCESS_DIR, "scripts", "run_preprocess.js"),
    rel(inputDir),
    "--html", rel(htmlPath),
    "--out", rel(preprocessOut),
    "--width", width,
    "--height", height,
  ];
  if (imagePath) preprocessArgs.push("--image", rel(imagePath));
  await runNode(preprocessArgs, "preprocess");

  const registryPath = path.join(preprocessOut, "semantic_registry.json");
  const anchorsPath = path.join(preprocessOut, "semantic_anchors.js");
  await runNode([
    path.join(PREPROCESS_DIR, "scripts", "build_semantic_registry.js"),
    "--input", rel(path.join(preprocessOut, "annotated_body_semantic.html")),
    "--out", rel(registryPath),
    "--js-out", rel(anchorsPath),
  ], "semantic registry");

  for (const [skill, label] of [
    ["taskflow-user-story", "blueprint phase1 user-story"],
    ["taskflow-state-enumeration", "blueprint phase2 state-enumeration"],
    ["taskflow-implementation-plan", "blueprint phase3 implementation-plan"],
    ["taskflow-blueprint-builder", "blueprint phase4 builder"],
  ]) {
    await runNode([
      path.join(BLUEPRINT_DIR, "scripts", "run_skill.js"),
      "--skill", skill,
      "--model", model,
      "--input", rel(inputPath),
      "--dirs", rel(inputDir),
    ], label);
  }

  const blueprintOut = path.join(runDir, "blueprint");
  const phase4Dir = latestPhaseDir(inputDir, model, "_phase4");
  if (!phase4Dir) throw new Error("Missing generated blueprint phase4 dir");
  await copyDir(phase4Dir, path.join(blueprintOut, "phase4"));
  const blueprintInputPath = path.join(blueprintOut, "phase4", "stages", "blueprint_builder_input.json");

  const stateOut = path.join(runDir, "state_implementation", "state_implementation_model.llm.json");
  await runNode([
    path.join(codegenDir, "sub-skills", "state-implementation-model", "scripts", "run_skill.js"),
    rel(inputDir),
    "--model", model,
    "--blueprint", rel(blueprintInputPath),
    "--registry", rel(registryPath),
    "--out", rel(stateOut),
    "--width", width,
    "--height", height,
  ], "state implementation model");

  const componentOut = path.join(runDir, `${codegenPrefix}component_codegen`);
  const componentGenerated = path.join(componentOut, "component_codegen.generated.json");
  await runNode([
    path.join(codegenDir, "sub-skills", "component-codegen", "scripts", "run_skill.js"),
    rel(inputDir),
    "--model", model,
    "--state-model", rel(stateOut),
    "--registry", rel(registryPath),
    "--out-dir", rel(componentOut),
    "--width", width,
    "--height", height,
  ], `${codegenName} component codegen`);

  const llmLayerOut = path.join(runDir, `${codegenPrefix}llm_layer_codegen`);
  const llmLayerHtml = path.join(inputDir, "html", codegenName === "code_gen2" ? "Index.state-model.code-gen2-layers.html" : "Index.state-model.llm-layers.html");
  await runNode([
    path.join(codegenDir, "sub-skills", "page-layer", "scripts", "run_skill.js"),
    rel(inputDir),
    "--model", model,
    "--html", rel(path.join(preprocessOut, "Index.preprocessed.html")),
    "--registry", rel(registryPath),
    "--state-model", rel(stateOut),
    "--blueprint", rel(blueprintInputPath),
    "--component-codegen", rel(componentGenerated),
    "--out-dir", rel(llmLayerOut),
    "--out-html", rel(llmLayerHtml),
    "--width", width,
    "--height", height,
  ], `${codegenName} static state layers`);

  const postprocessChanged = injectStateKeyNavIntoFile(llmLayerHtml);
  const postprocess = {
    state_key_nav_present: readUtf8(llmLayerHtml).includes("tf-state-key-nav"),
    state_key_nav_changed: postprocessChanged,
  };

  const preprocessReport = readJson(path.join(preprocessOut, "report.json"));
  const registry = readJson(registryPath);
  const stateValidation = readJson(stateOut.replace(/\.json$/, ".validation.json"));
  const stateModel = readJson(stateOut);
  const layerReport = readJson(path.join(llmLayerOut, "run_report.json"));

  report.outputs = {
    run_dir: rel(runDir),
    codegen: codegenName,
    preprocess_dir: rel(preprocessOut),
    preprocessed_html: rel(path.join(preprocessOut, "Index.preprocessed.html")),
    page_dsl: rel(path.join(preprocessOut, "spec.used.json")),
    semantic_registry: rel(registryPath),
    semantic_anchors: rel(anchorsPath),
    blueprint: rel(blueprintInputPath),
    state_implementation_model: rel(stateOut),
    component_codegen: rel(componentGenerated),
    llm_layer_html: rel(llmLayerHtml),
    llm_layer_dir: rel(llmLayerOut),
    state_layers_report: rel(path.join(llmLayerOut, "auto_shots", "state_layers_report.json")),
    postprocess,
  };
  report.checks = {
    preprocess_ok: preprocessReport.ok === true,
    semantic_anchor_count: Object.keys(registry.semantic_dom_registry || {}).length,
    state_model_states: Array.isArray(stateModel.states) ? stateModel.states.length : 0,
    state_model_issues: stateValidation.issues || [],
    llm_layers_ok: layerReport.ok === true,
    screenshot_summary: layerReport.screenshot_summary,
  };
  report.ok = Boolean(
    report.checks.preprocess_ok &&
    report.checks.semantic_anchor_count > 0 &&
    report.checks.state_model_states >= 3 &&
    report.checks.state_model_issues.length === 0 &&
    report.checks.llm_layers_ok
  );

  writeJson(path.join(runDir, "run_report.json"), report);
  console.log(`[taskflow-llm-pagegen] done ok=${report.ok} run_dir=${rel(runDir)}`);
  if (!report.ok) process.exitCode = 2;
}

main().catch((err) => {
  console.error("[taskflow-llm-pagegen] ERROR:", err.stack || err.message);
  process.exit(1);
});
