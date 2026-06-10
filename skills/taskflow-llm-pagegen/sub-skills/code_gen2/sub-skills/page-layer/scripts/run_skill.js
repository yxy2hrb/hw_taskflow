// LLM-generated React + AntD static state-layer runner.
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");
const { injectStateKeyNavIntoFile } = require("../../../../../scripts/inject_state_key_nav");

const ROOT = path.resolve(__dirname, "../../../../../../../..");
const SKILL_ROOT = path.resolve(__dirname, "../../../../..");

function readUtf8(file) { return fs.readFileSync(file, "utf8"); }
function readJson(file) { return JSON.parse(readUtf8(file)); }
function writeUtf8(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text, "utf8"); }
function writeJson(file, value) { writeUtf8(file, JSON.stringify(value, null, 2)); }
function exists(file) { return fs.existsSync(file); }
function argValue(args, name, fallback) { const idx = args.indexOf(name); return idx >= 0 ? args[idx + 1] : fallback; }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, "/"); }
function stateNum(id) { const m = String(id || "").match(/(\d+)/); return m ? Number(m[1]) : 0; }
function extractBlock(html, tag) { const m = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "i")); return m ? m[0] : ""; }
function extractBodyInner(html) { const m = String(html || "").match(/<body[^>]*>([\s\S]*?)<\/body>/i); return m ? m[1] : String(html || ""); }

function designSystemCss() {
  const file = path.resolve(__dirname, "../../../resources/global.css");
  if (!exists(file)) return "";
  return readUtf8(file)
    .replace(/@import[^\n]+\n/g, "")
    .replace(/@tailwind[^\n]+\n/g, "")
    .trim();
}

function loadDotEnv(file) {
  if (!exists(file)) return;
  for (const line of readUtf8(file).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] == null) process.env[match[1]] = value;
  }
}

function stripThink(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJson(text) {
  let source = stripThink(text);
  const markdown = source.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdown) source = markdown[1].trim();
  const json = source.match(/\{[\s\S]*\}/);
  if (json) source = json[0];
  return JSON.parse(source);
}

async function callLLM({ model, system, user, maxTokens }) {
  loadDotEnv(path.join(SKILL_ROOT, ".env"));
  loadDotEnv(path.join(ROOT, "backend", ".env"));
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing DASHSCOPE_API_KEY or OPENAI_API_KEY");
  const base = (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: Number(process.env.MODEL_TEMPERATURE ?? 0.2),
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 1000)}`);
      const json = JSON.parse(body);
      return json.choices?.[0]?.message?.content || "";
    } catch (err) {
      lastErr = err;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }
  }
  throw lastErr;
}

function slimRegistry(registry) {
  const out = {};
  for (const [name, item] of Object.entries(registry.semantic_dom_registry || {})) {
    out[name] = {
      selector: item.selector,
      bbox: item.bbox,
      area: item.area,
      component: item.component || item.semantic,
      text: item.text || "",
      policy: item.inheritance_policy,
    };
  }
  return out;
}

function slimStateModel(model) {
  return {
    states: (model.states || []).map((state) => ({
      id: state.id,
      label: state.label,
      ui_intent: state.ui_intent,
      height: Number(state.height) || null,
      parent_state: state.parent_state,
      trigger: state.trigger || null,
      inheritance: {
        keep: state.inheritance?.keep || [],
        create: state.inheritance?.create || [],
        update: state.inheritance?.update || [],
      },
      patches: state.patches || [],
    })),
  };
}

function normalizeBlueprint(input, model) {
  if (input?.meta && Array.isArray(input.states)) return input;
  if (input?.merged_states_by_id) {
    return {
      states: Object.values(input.merged_states_by_id)
        .map((s) => ({ state_id: stateNum(s.id), state_name: s.label || s.id, description: s.description || "" }))
        .filter((s) => s.state_id > 0)
        .sort((a, b) => a.state_id - b.state_id),
    };
  }
  return { states: (model.states || []).map((s) => ({ state_id: stateNum(s.id), state_name: s.label || s.id, description: s.ui_intent || "" })) };
}

function heightForState(model, stateId, fallback) {
  const n = stateNum(stateId);
  const state = (model.states || []).find((item) => stateNum(item.id) === n);
  const height = Number(state?.height);
  return Number.isFinite(height) && height > 0 ? height : fallback;
}

function truncateText(value, limit = 5000) {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit)}\n/* truncated */` : text;
}

function slimComponentCodegen(componentCodegen) {
  if (!componentCodegen?.components?.length) return null;
  return {
    ok: componentCodegen.ok === true,
    source_state_model: componentCodegen.source_state_model || null,
    components: componentCodegen.components.map((record) => {
      const inputComponent = record.input?.component || {};
      const renderedComponent = record.component || {};
      return {
        state_id: record.state_id,
        operation: record.operation,
        id: renderedComponent.id || inputComponent.id || inputComponent.name || null,
        component: inputComponent.component || renderedComponent.component || null,
        bbox: inputComponent.bbox || renderedComponent.bbox || null,
        layout: inputComponent.layout || null,
        props: inputComponent.props || null,
        content_density: inputComponent.content_density || null,
        content_requirements: inputComponent.content_requirements || [],
        is_top_level: record.input?.is_top_level !== false,
        generated_children: (record.input?.generated_children || []).map((child) => ({
          id: child.id || null,
          component: child.component || null,
          importName: child.importName || null,
          importPath: child.importPath || null,
        })),
        text: inputComponent.text || renderedComponent.text || renderedComponent.visible_text || null,
        description: inputComponent.description || renderedComponent.description || null,
        reactCode: truncateText(renderedComponent.reactCode, record.input?.is_top_level === false ? 1500 : 3500),
        issues: record.issues || [],
      };
    }),
  };
}

function buildPromptInput({ registry, model, blueprint, componentCodegen, width, height }) {
  return {
    viewport: {
      width,
      initial_height: height,
      width_locked: true,
      height_may_expand: true,
    },
    blueprint: normalizeBlueprint(blueprint, model),
    semantic_registry: slimRegistry(registry),
    state_implementation_model: slimStateModel(model),
    component_codegen: slimComponentCodegen(componentCodegen),
    global_css: truncateText(designSystemCss(), 12000),
  };
}

function hasStateSection(html, stateId) {
  return new RegExp(`<section\\b[^>]*id=["']tf-state-${stateNum(stateId)}["']`).test(String(html || ""));
}

function validateGenerated(parsed, stateModel) {
  const issues = [];
  if (!parsed || typeof parsed !== "object") issues.push("response is not object");
  if (typeof parsed.html !== "string" || !parsed.html.includes("tf-state-")) issues.push("missing html tf-state layers");
  if (typeof parsed.css !== "string") issues.push("missing css string");
  for (const state of stateModel.states || []) {
    if (stateNum(state.id) > 1 && !hasStateSection(parsed?.html, state.id)) {
      issues.push(`missing section for ${state.id}`);
    }
  }
  return issues;
}

function validatePlaceholderGenerated(parsed, stateModel) {
  const issues = validateGenerated(parsed, stateModel);
  const html = String(parsed?.html || "");
  const renderedComponentRe = /<([a-z][\w:-]*)\b(?=[^>]*\bdata-component-id=["'][^"']+["'])(?![^>]*\btf-component-placeholder\b)[^>]*>/gi;
  const matches = [...html.matchAll(renderedComponentRe)];
  if (matches.length) {
    issues.push(`LLM output must use component placeholders only, found inline component roots: ${matches.slice(0, 5).map((m) => m[0].slice(0, 80)).join(" | ")}`);
  }
  return issues;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function componentRecordId(record) {
  return record?.component?.id || record?.input?.component?.id || record?.input?.component?.name || "";
}

function componentRecordStateNum(record) {
  return stateNum(record?.state_id);
}

function validBboxArray(bbox) {
  const values = Array.isArray(bbox) ? bbox.map(Number) : [];
  return values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0;
}

function latestComponentRecord(componentCodegen, id, stateId) {
  const current = stateNum(stateId);
  return (componentCodegen?.components || [])
    .filter((record) => componentRecordId(record) === id && componentRecordStateNum(record) <= current)
    .sort((a, b) => componentRecordStateNum(b) - componentRecordStateNum(a))[0] || null;
}

function latestComponentRecordWithBbox(componentCodegen, id, stateId) {
  const current = stateNum(stateId);
  return (componentCodegen?.components || [])
    .filter((record) => componentRecordId(record) === id && componentRecordStateNum(record) <= current)
    .filter((record) => validBboxArray(record?.input?.component?.bbox || record?.component?.bbox))
    .sort((a, b) => componentRecordStateNum(b) - componentRecordStateNum(a))[0] || null;
}

function isTopLevelComponentRecord(record) {
  return record?.input?.is_top_level !== false;
}

function stateExpectedComponentIds(state, componentCodegen) {
  const out = [];
  function add(id) {
    if (id && !out.includes(id)) out.push(id);
  }
  // Kept virtual components are the inherited base page and must render below
  // current-state overlays, masks, sheets, and dialogs.
  for (const item of state.inheritance?.keep || []) {
    const record = typeof item === "string" ? latestComponentRecord(componentCodegen, item, state.id) : null;
    if (record && isTopLevelComponentRecord(record)) add(item);
  }
  for (const item of state.inheritance?.update || []) add(item?.id || item?.name);
  for (const item of state.inheritance?.create || []) add(item?.id || item?.name);
  return out;
}

function sectionHasComponent(sectionHtml, id) {
  const escaped = escapeRegExp(id);
  const re = new RegExp(`<[^>]+data-component-id=["']${escaped}["'][^>]*>`, "g");
  return [...String(sectionHtml || "").matchAll(re)].some((match) => !/\btf-component-placeholder\b/.test(match[0]));
}

function injectMissingComponentHtml(sectionHtml, snippets) {
  if (!snippets.length) return sectionHtml;
  const insertion = snippets.join("");
  const keepPattern = /(<div\b[^>]*class=["'][^"']*\btf-keep-placeholder\b[^"']*["'][^>]*><\/div>\s*)+/i;
  if (keepPattern.test(sectionHtml)) {
    return sectionHtml.replace(keepPattern, (match) => match + insertion);
  }
  return sectionHtml.replace(/(<section\b[^>]*>)/i, `$1${insertion}`);
}

function componentPlaceholder(id) {
  return `<div class="tf-component-placeholder" data-component-id="${String(id).replace(/"/g, "&quot;")}"></div>`;
}

function componentPlaceholdersForState(state, componentCodegen) {
  return stateExpectedComponentIds(state, componentCodegen).map(componentPlaceholder).join("");
}

function escapeHtmlAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function directPatchForComponent(state, id) {
  for (const patch of state.inheritance?.create || []) {
    if ((patch?.id || patch?.name) === id) return patch;
  }
  for (const patch of state.inheritance?.update || []) {
    if ((patch?.id || patch?.name) === id) return patch;
  }
  return null;
}

function componentLayoutSpec(state, componentCodegen, id) {
  const direct = directPatchForComponent(state, id);
  if (validBboxArray(direct?.bbox)) return direct;

  const latest = latestComponentRecord(componentCodegen, id, state.id)?.input?.component || null;
  if (validBboxArray(latest?.bbox)) return latest;

  const latestWithBboxRecord = latestComponentRecordWithBbox(componentCodegen, id, state.id);
  const latestWithBbox = latestWithBboxRecord?.input?.component || latestWithBboxRecord?.component || null;
  if (direct && validBboxArray(latestWithBbox?.bbox)) {
    return {
      ...latestWithBbox,
      ...direct,
      bbox: latestWithBbox.bbox,
      props: {
        ...(latestWithBbox.props || {}),
        ...(direct.props || {}),
      },
    };
  }

  return direct || latest || null;
}

function componentFrameStyle(spec) {
  const bbox = Array.isArray(spec?.bbox) ? spec.bbox.map(Number) : null;
  if (!validBboxArray(bbox)) return "";
  const zIndex = Number(spec?.props?.zIndex ?? spec?.zIndex);
  return [
    "position:absolute",
    `left:${bbox[0]}px`,
    `top:${bbox[1]}px`,
    `width:${bbox[2]}px`,
    `height:${bbox[3]}px`,
    Number.isFinite(zIndex) ? `z-index:${zIndex}` : "",
  ].filter(Boolean).join(";");
}

function wrapComponentHtml(html, { id, state, componentCodegen }) {
  const style = componentFrameStyle(componentLayoutSpec(state, componentCodegen, id));
  if (!style) return html;
  return `<div class="tf-component-frame" data-component-frame="${escapeHtmlAttr(id)}" style="${style}">${html}</div>`;
}

function placeholderAlreadyHasFrame(sectionHtml, offset) {
  const prefix = String(sectionHtml || "").slice(Math.max(0, offset - 800), offset);
  const lastFrame = prefix.lastIndexOf("tf-component-frame");
  if (lastFrame < 0) return false;
  const lastClose = prefix.lastIndexOf("</div>");
  return lastFrame > lastClose;
}

function placeholderFrameHasCompleteBbox(sectionHtml, offset) {
  const prefix = String(sectionHtml || "").slice(Math.max(0, offset - 1200), offset);
  const lastFrame = prefix.lastIndexOf("tf-component-frame");
  if (lastFrame < 0) return false;
  const tagStart = prefix.lastIndexOf("<", lastFrame);
  const tagEnd = prefix.indexOf(">", lastFrame);
  if (tagStart < 0 || tagEnd < 0) return false;
  const tag = prefix.slice(tagStart, tagEnd + 1);
  const style = (tag.match(/\bstyle=["']([^"']*)["']/i) || [])[1] || "";
  return /position\s*:\s*(absolute|fixed)/i.test(style)
    && /left\s*:/i.test(style)
    && /top\s*:/i.test(style)
    && /width\s*:/i.test(style)
    && /height\s*:/i.test(style);
}

function keepPlaceholdersForState(state, componentCodegen) {
  return (state.inheritance?.keep || [])
    .filter((anchor) => {
      if (typeof anchor !== "string") return false;
      const record = latestComponentRecord(componentCodegen, anchor, state.id);
      return !record || !isTopLevelComponentRecord(record);
    })
    .map((anchor) => `<div class="tf-keep-placeholder" data-keep-anchor="${String(anchor).replace(/"/g, "&quot;")}"></div>`)
    .join("");
}

function statusKeepAnchors(registry) {
  return Object.keys(registry.semantic_dom_registry || {}).filter((anchor) => /状态栏|status/i.test(anchor));
}

function expectedKeepAnchorsForState(state, componentCodegen, registry) {
  const anchors = [];
  function add(anchor) {
    if (anchor && !anchors.includes(anchor)) anchors.push(anchor);
  }
  for (const anchor of state.inheritance?.keep || []) {
    if (typeof anchor !== "string") continue;
    const record = latestComponentRecord(componentCodegen, anchor, state.id);
    if (!record || !isTopLevelComponentRecord(record)) add(anchor);
  }
  if (stateNum(state.id) > 1) {
    for (const anchor of statusKeepAnchors(registry)) add(anchor);
  }
  return anchors;
}

function keepPlaceholder(anchor) {
  return `<div class="tf-keep-placeholder" data-keep-anchor="${String(anchor).replace(/"/g, "&quot;")}"></div>`;
}

function buildRuleGenerated(stateModel, componentCodegen) {
  const sections = [];
  for (const state of stateModel.states || []) {
    const n = stateNum(state.id);
    if (n <= 1) continue;
    const keeps = keepPlaceholdersForState(state, componentCodegen);
    const components = componentPlaceholdersForState(state, componentCodegen);
    sections.push(`<section id="tf-state-${n}" class="tf-state-layer tf-llm-layer" style="display:none">${keeps}${components}</section>`);
  }
  return {
    html: sections.join(""),
    css: "",
    reactCode: "",
    validation_notes: "Rule-generated page layer: sections, keep placeholders, and top-level component placeholders were built directly from state_implementation_model and recursive component_codegen. Nested children are rendered inside their parent components. No LLM invocation was used.",
  };
}

function componentSnippetsForState(state, componentCodegen, appendedCss) {
  const snippets = [];
  for (const id of stateExpectedComponentIds(state, componentCodegen)) {
    const record = latestComponentRecord(componentCodegen, id, state.id);
    const html = record?.component?.html;
    if (typeof html !== "string" || !html.trim()) continue;
    snippets.push(wrapComponentHtml(html, { id, state, componentCodegen }));
    if (record.component.css) appendedCss.push(`\n/* component-codegen fallback: ${id} */\n${record.component.css}`);
  }
  return snippets;
}

function ensureStateSectionCoverage(generated, stateModel, componentCodegen, registry) {
  if (!generated || typeof generated.html !== "string") return generated;
  const appendedCss = [];
  const sections = [];
  for (const state of stateModel.states || []) {
    if (stateNum(state.id) <= 1 || hasStateSection(generated.html, state.id)) continue;
    const keeps = expectedKeepAnchorsForState(state, componentCodegen, registry).map(keepPlaceholder).join("");
    const placeholders = componentPlaceholdersForState(state, componentCodegen);
    sections.push(`<section id="tf-state-${stateNum(state.id)}" class="tf-state-layer tf-llm-layer" style="display:none">${keeps}${placeholders}</section>`);
  }
  if (sections.length) {
    generated.html = `${generated.html}${sections.join("")}`;
    generated.validation_notes = [generated.validation_notes, `Runner inserted missing sections: ${sections.length}.`]
      .filter(Boolean)
      .join(" ");
  }
  return generated;
}

function ensureKeepPlaceholderCoverage(generated, stateModel, componentCodegen, registry) {
  if (!generated || typeof generated.html !== "string") return generated;
  let inserted = 0;
  generated.html = generated.html.replace(/<section\b[^>]*id=["']tf-state-(\d+)["'][\s\S]*?<\/section>/g, (sectionHtml, n) => {
    const state = (stateModel.states || []).find((item) => stateNum(item.id) === Number(n));
    if (!state || stateNum(state.id) <= 1) return sectionHtml;
    const missing = expectedKeepAnchorsForState(state, componentCodegen, registry)
      .filter((anchor) => !new RegExp(`data-keep-anchor=["']${escapeRegExp(anchor)}["']`).test(sectionHtml));
    if (!missing.length) return sectionHtml;
    inserted += missing.length;
    return sectionHtml.replace(/(<section\b[^>]*>)/i, `$1${missing.map(keepPlaceholder).join("")}`);
  });
  if (inserted) {
    generated.validation_notes = [generated.validation_notes, `Runner inserted missing keep placeholders: ${inserted}.`]
      .filter(Boolean)
      .join(" ");
  }
  return generated;
}

function fillComponentPlaceholders(generated, stateModel, componentCodegen) {
  if (!generated || typeof generated.html !== "string" || !componentCodegen?.components?.length) return generated;
  const appendedCss = [];
  let changed = false;
  const placeholderRe = /<div\b(?=[^>]*\btf-component-placeholder\b)(?=[^>]*\bdata-component-id=["'][^"']+["'])[^>]*>\s*<\/div>/g;
  generated.html = generated.html.replace(/<section\b[^>]*id=["']tf-state-(\d+)["'][\s\S]*?<\/section>/g, (sectionHtml, n) => {
    const state = (stateModel.states || []).find((item) => stateNum(item.id) === Number(n));
    if (!state) return sectionHtml;
    return sectionHtml.replace(placeholderRe, (placeholder, offset, fullSectionHtml) => {
      const id = (placeholder.match(/\bdata-component-id=["']([^"']+)["']/) || [])[1];
      const record = latestComponentRecord(componentCodegen, id, state.id);
      const html = record?.component?.html;
      if (typeof html !== "string" || !html.trim()) return placeholder;
      changed = true;
      if (record.component.css) appendedCss.push(`\n/* component-codegen placeholder: ${id} */\n${record.component.css}`);
      const framedHtml = wrapComponentHtml(html, { id, state, componentCodegen });
      if (placeholderAlreadyHasFrame(fullSectionHtml, offset)) {
        return placeholderFrameHasCompleteBbox(fullSectionHtml, offset) ? html : framedHtml;
      }
      return framedHtml;
    });
  });
  if (changed) {
    generated.css = `${generated.css || ""}${appendedCss.join("")}`;
    generated.validation_notes = [generated.validation_notes, "Runner filled component placeholders from component_codegen."]
      .filter(Boolean)
      .join(" ");
  }
  return generated;
}

function ensureComponentCodegenCoverage(generated, stateModel, componentCodegen) {
  if (!generated || typeof generated.html !== "string" || !componentCodegen?.components?.length) return generated;
  const appendedCss = [];
  let patchedHtml = generated.html.replace(/<section\b[^>]*id=["']tf-state-(\d+)["'][\s\S]*?<\/section>/g, (sectionHtml, n) => {
    const state = (stateModel.states || []).find((item) => stateNum(item.id) === Number(n));
    if (!state) return sectionHtml;
    const missing = [];
    for (const id of stateExpectedComponentIds(state, componentCodegen)) {
      if (sectionHasComponent(sectionHtml, id)) continue;
      const record = latestComponentRecord(componentCodegen, id, state.id);
      const html = record?.component?.html;
      if (typeof html !== "string" || !html.trim()) continue;
      missing.push(wrapComponentHtml(html, { id, state, componentCodegen }));
      if (record.component.css) appendedCss.push(`\n/* component-codegen fallback: ${id} */\n${record.component.css}`);
    }
    return injectMissingComponentHtml(sectionHtml, missing);
  });
  if (patchedHtml !== generated.html) {
    generated.html = patchedHtml;
    generated.css = `${generated.css || ""}${appendedCss.join("")}`;
    generated.validation_notes = [generated.validation_notes, "Runner inserted missing component_codegen snippets for state coverage."]
      .filter(Boolean)
      .join(" ");
  }
  return generated;
}

function normalizeKeepPlaceholderCss(generated) {
  if (!generated || typeof generated.css !== "string") return generated;
  const before = generated.css;
  generated.css = generated.css
    .replace(/[^{}]*\.tf-keep-placeholder[^{}]*\{[^{}]*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^{}]*\}/gi, "")
    .replace(/[^{}]*\[data-keep-anchor\][^{}]*\{[^{}]*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^{}]*\}/gi, "");
  generated.css = `${generated.css || ""}\n.tf-llm-layer .tf-keep-placeholder,.tf-llm-layer [data-keep-anchor]{display:block!important;visibility:visible!important;opacity:1!important;}`;
  if (generated.css !== before) {
    generated.validation_notes = [generated.validation_notes, "Runner normalized keep placeholder visibility."]
      .filter(Boolean)
      .join(" ");
  }
  return generated;
}

function buildHtml({ originalHtml, registry, generated, stateModel, width, height }) {
  const head = extractBlock(originalHtml, "head") || "<head><meta charset=\"utf-8\"></head>";
  const body = extractBodyInner(originalHtml);
  const runtimeModel = slimStateModel(stateModel);
  const stateHeightCss = (stateModel.states || [])
    .map((state) => {
      const n = stateNum(state.id);
      if (n <= 1) return "";
      return `#tf-state-${n}{min-height:${heightForState(stateModel, state.id, height)}px!important;}`;
    })
    .filter(Boolean)
    .join("\n");
  return `<!doctype html>
<html lang="zh-CN">
${head}
<body>
<div id="app-root">${body}</div>
<div id="tf-layer-root">${generated.html || ""}</div>
<style id="tf-llm-base-style">
.tf-state-layer{position:fixed!important;left:0!important;top:0!important;width:${width}px!important;min-height:${height}px!important;z-index:9999!important;background:#f5f5f5;color:#1f1f1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;overflow-y:auto;overflow-x:hidden}
.tf-llm-layer *{box-sizing:border-box}
.tf-keep-placeholder{position:absolute;overflow:hidden;pointer-events:none;z-index:2147483000!important}
.tf-keep-placeholder>.tf-keep-crop{position:absolute;pointer-events:none}
.tf-component-frame{position:absolute;box-sizing:border-box}
.tf-component-frame>[data-component-id]{position:relative!important;left:auto!important;top:auto!important;width:100%!important;max-width:100%!important;height:100%!important;box-sizing:border-box;z-index:auto!important}
.tf-component-frame>[data-component-id*="sheet"].tf-cg-sheet-overlay{background:transparent!important}
.tf-component-frame>[data-component-id*="sheet"]>.tf-cg-mask,.tf-component-frame>[data-component-id*="sheet"] .tf-cg-mask,.tf-component-frame>[data-component-id*="sheet"]>.tf-cg-sheet-mask,.tf-component-frame>[data-component-id*="sheet"] .tf-cg-sheet-mask{display:none!important}
${stateHeightCss}
${designSystemCss()}
${generated.css || ""}
</style>
<script>
window.__TF_REGISTRY__=${JSON.stringify(registry.semantic_dom_registry || {})};
window.__TF_ANCHORS__=${JSON.stringify(registry.semanticAnchors || {})};
window.__TF_STATE_MODEL__=${JSON.stringify(runtimeModel)};
function tfNum(id){
  const match=String(id||"").match(/(\\d+)/);
  return match?Number(match[1]):0;
}
function tfCssEscape(value){
  if(window.CSS && typeof window.CSS.escape==="function") return window.CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g,"\\\\$&");
}
function tfPx(value){
  const n=Number(value||0);
  return Number.isFinite(n)?n:0;
}
function tfStyleNumber(el,name){
  if(!el) return NaN;
  const inline=el.style && el.style[name];
  if(inline) return parseFloat(inline);
  const computed=window.getComputedStyle?window.getComputedStyle(el):null;
  return computed ? parseFloat(computed[name]) : NaN;
}
function tfStateById(id){
  const model=window.__TF_STATE_MODEL__ || {};
  return (model.states||[]).find(function(state){ return state.id===id; }) || null;
}
function tfSourceSpec(state, anchor){
  if(!state || !state.inheritance) return null;
  const lists=[state.inheritance.create||[],state.inheritance.update||[]];
  for(const list of lists){
    const hit=list.find(function(item){ return item && item.id===anchor; });
    if(hit) return hit;
  }
  return null;
}
function tfAncestorStates(stateNumber){
  const out=[];
  let state=tfStateById("state_"+stateNumber);
  const seen=new Set();
  while(state && state.parent_state && !seen.has(state.parent_state)){
    seen.add(state.parent_state);
    const parent=tfStateById(state.parent_state);
    if(!parent) break;
    out.push(parent);
    state=parent;
  }
  return out;
}
function tfFindVirtualNode(sourceLayer, anchor, spec){
  if(!sourceLayer) return null;
  const escaped=tfCssEscape(anchor);
  const direct=sourceLayer.querySelector("#"+escaped+",[data-component-id='"+String(anchor).replace(/'/g,"\\\\'")+"']");
  if(direct) return direct;
  if(spec && Array.isArray(spec.bbox)){
    const bbox=spec.bbox.map(tfPx);
    const candidates=sourceLayer.querySelectorAll("[style]");
    for(const node of candidates){
      const left=tfStyleNumber(node,"left");
      const top=tfStyleNumber(node,"top");
      const width=tfStyleNumber(node,"width");
      const height=tfStyleNumber(node,"height");
      if(Math.abs(left-bbox[0])<=1 && Math.abs(top-bbox[1])<=1 && Math.abs(width-bbox[2])<=1 && Math.abs(height-bbox[3])<=1) {
        return node;
      }
    }
  }
  if(spec && /app_bar|nav_bar|navbar|header/i.test(String(spec.component||""))) {
    return sourceLayer.querySelector(".tf-llm-appbar,.tf-appbar,.tf-app_bar,.tf-navbar,.tf-nav_bar,.tf-header");
  }
  return null;
}
function tfFillVirtualKeep(slot, layer, anchor){
  const stateNumber=tfNum(layer && layer.id);
  const ancestors=tfAncestorStates(stateNumber);
  for(const state of ancestors){
    const spec=tfSourceSpec(state, anchor);
    if(!spec) continue;
    const sourceLayer=document.getElementById("tf-state-"+tfNum(state.id));
    const source=tfFindVirtualNode(sourceLayer, anchor, spec);
    if(!source) continue;
    const bbox=Array.isArray(spec.bbox) ? spec.bbox.map(tfPx) : [
      tfStyleNumber(source,"left"),
      tfStyleNumber(source,"top"),
      tfStyleNumber(source,"width"),
      tfStyleNumber(source,"height"),
    ];
    if(bbox.some(function(n){ return !Number.isFinite(n); })) return false;
    slot.style.left=bbox[0]+"px";
    slot.style.top=bbox[1]+"px";
    slot.style.width=bbox[2]+"px";
    slot.style.height=bbox[3]+"px";
    const clone=source.cloneNode(true);
    clone.removeAttribute("id");
    clone.style.position="absolute";
    clone.style.left="0px";
    clone.style.top="0px";
    clone.style.width=bbox[2]+"px";
    clone.style.height=bbox[3]+"px";
    slot.appendChild(clone);
    return true;
  }
  return false;
}
function tfFillKeepPlaceholders(layer){
  if(!layer) return;
  const appRoot=document.getElementById("app-root");
  layer.querySelectorAll("[data-keep-anchor]").forEach(function(slot){
    const anchor=slot.getAttribute("data-keep-anchor");
    const registry=window.__TF_REGISTRY__ || {};
    const bbox=registry[anchor] && registry[anchor].bbox;
    slot.innerHTML="";
    if(!Array.isArray(bbox) || !appRoot) {
      tfFillVirtualKeep(slot, layer, anchor);
      return;
    }
    slot.style.left=Number(bbox[0]||0)+"px";
    slot.style.top=Number(bbox[1]||0)+"px";
    slot.style.width=Number(bbox[2]||0)+"px";
    slot.style.height=Number(bbox[3]||0)+"px";
    const crop=document.createElement("div");
    crop.className="tf-keep-crop";
    crop.style.left=(-Number(bbox[0]||0))+"px";
    crop.style.top=(-Number(bbox[1]||0))+"px";
    crop.style.width="${width}px";
    crop.style.height="${height}px";
    Array.prototype.forEach.call(appRoot.childNodes,function(node){ crop.appendChild(node.cloneNode(true)); });
    slot.appendChild(crop);
  });
}
function tfInstallGoto(){
  window.TF={current:1,goto:function(id){
    const n=Number(String(id).replace(/\\D/g,""))||1;
    const appRoot=document.getElementById("app-root");
    this.current=n;
    document.querySelectorAll(".tf-state-layer").forEach(function(layer){layer.style.display="none";});
    if(n===1) {
      if(appRoot) appRoot.style.display="";
      return;
    }
    const layer=document.getElementById("tf-state-"+n);
    if(layer){
      if(appRoot) appRoot.style.display="";
      tfFillKeepPlaceholders(layer);
      layer.style.display="block";
      if(appRoot) appRoot.style.display="none";
    }
  }};
}
tfInstallGoto();
window.__TF_LLM_READY__=true;
</script>
</body>
</html>`;
}

async function screenshotStates({ htmlPath, blueprint, model, outDir, width, height }) {
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });
  const normalized = normalizeBlueprint(blueprint, model);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__TF_LLM_READY__ && window.TF && typeof window.TF.goto === "function", null, { timeout: 20000 });
  const shots = [];
  for (const state of normalized.states) {
    const shotHeight = heightForState(model, `state_${state.state_id}`, height);
    await page.setViewportSize({ width, height: shotHeight });
    await page.evaluate((n) => window.TF.goto(n), state.state_id);
    await page.waitForTimeout(400);
    const layerStatus = await page.evaluate((n) => {
      if (n === 1) return { exists: true, visible: true };
      const layer = document.getElementById("tf-state-" + n);
      return { exists: Boolean(layer), visible: Boolean(layer && window.getComputedStyle(layer).display !== "none") };
    }, state.state_id);
    const file = `state_${state.state_id}_force.png`;
    const target = path.join(outDir, file);
    await page.screenshot({ path: target, fullPage: false });
    const notBlank = fs.statSync(target).size > 1000;
    const shotIssues = [];
    if (!notBlank) shotIssues.push("blank screenshot");
    if (!layerStatus.exists) shotIssues.push("missing state layer");
    if (layerStatus.exists && !layerStatus.visible) shotIssues.push("state layer not visible");
    shots.push({ state_id: state.state_id, state_name: state.state_name, height: shotHeight, screenshot: file, not_blank: notBlank, layer_exists: layerStatus.exists, layer_visible: layerStatus.visible, status: shotIssues.length ? "fail" : "pass", issues: shotIssues });
  }
  await browser.close();
  const issues = shots.filter((shot) => shot.issues.length);
  const report = { html_path: rel(htmlPath), timestamp: new Date().toISOString(), shots, summary: { total_states: shots.length, force_pass: shots.filter((s) => s.status === "pass").length, issues_found: issues } };
  writeJson(path.join(outDir, "state_layers_report.json"), report);
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const base = path.resolve(ROOT, args[0] || ".");
  const modelName = argValue(args, "--model", "qwen3.7-max");
  const htmlPath = path.resolve(ROOT, argValue(args, "--html", path.join(base, ".run_skill/latest/preprocess/Index.preprocessed.html")));
  const registryPath = path.resolve(ROOT, argValue(args, "--registry", path.join(base, ".run_skill/latest/preprocess/semantic_registry.json")));
  const stateModelPath = path.resolve(ROOT, argValue(args, "--state-model", path.join(base, ".run_skill/latest/state_implementation/state_implementation_model.llm.json")));
  const blueprintPath = path.resolve(ROOT, argValue(args, "--blueprint", ""));
  const componentCodegenPath = path.resolve(ROOT, argValue(args, "--component-codegen", ""));
  const outDir = path.resolve(ROOT, argValue(args, "--out-dir", path.join(base, ".run_skill", "llm_layer_codegen")));
  const outHtml = path.resolve(ROOT, argValue(args, "--out-html", path.join(base, "html", "Index.state-model.llm-layers.html")));
  const width = Number(argValue(args, "--width", "360"));
  const height = Number(argValue(args, "--height", "792"));
  const ruleOnly = args.includes("--rule-only");
  const maxTokens = Number(argValue(args, "--max-tokens", "12000"));

  const originalHtml = readUtf8(htmlPath);
  const registry = readJson(registryPath);
  const stateModel = readJson(stateModelPath);
  const blueprint = blueprintPath && exists(blueprintPath) ? readJson(blueprintPath) : null;
  const componentCodegen = componentCodegenPath && exists(componentCodegenPath) ? readJson(componentCodegenPath) : null;
  const promptInput = buildPromptInput({ registry, model: stateModel, blueprint, componentCodegen, width, height });
  writeJson(path.join(outDir, "llm_layer_input.json"), promptInput);

  let generated;
  let generationMode = "llm-placeholder";
  if (ruleOnly) {
    generated = buildRuleGenerated(stateModel, componentCodegen);
    generationMode = "rule-only";
  } else {
    const skill = readUtf8(path.resolve(__dirname, "..", "SKILL.md"));
    try {
      const raw = await callLLM({
        model: modelName,
        system: `${skill}\n\nReturn JSON only. The JSON must contain placeholder HTML, not rendered component HTML.`,
        user: JSON.stringify(promptInput),
        maxTokens,
      });
      writeUtf8(path.join(outDir, "llm_layer.raw.txt"), raw);
      generated = extractJson(raw);
      const placeholderIssues = validatePlaceholderGenerated(generated, stateModel);
      if (placeholderIssues.length) {
        throw new Error(placeholderIssues.join("\n"));
      }
    } catch (err) {
      writeUtf8(path.join(outDir, "llm_layer.error.txt"), String(err.stack || err.message || err));
      generated = buildRuleGenerated(stateModel, componentCodegen);
      generationMode = "rule-fallback";
    }
  }
  if (generationMode !== "llm-placeholder") {
    writeUtf8(path.join(outDir, "llm_layer.raw.txt"), JSON.stringify(generated));
  }
  generated.validation_notes = [generated.validation_notes, `generation_mode:${generationMode}`].filter(Boolean).join(" ");
  ensureStateSectionCoverage(generated, stateModel, componentCodegen, registry);
  ensureKeepPlaceholderCoverage(generated, stateModel, componentCodegen, registry);
  fillComponentPlaceholders(generated, stateModel, componentCodegen);
  ensureComponentCodegenCoverage(generated, stateModel, componentCodegen);
  normalizeKeepPlaceholderCss(generated);
  const issues = validateGenerated(generated, stateModel);
  writeJson(path.join(outDir, "llm_layer.generated.json"), generated);
  writeJson(path.join(outDir, "llm_layer.validation.json"), { issues });
  if (issues.length) {
    console.error("[llm-layer] validation issues:\n" + issues.join("\n"));
    process.exit(2);
  }

  const html = buildHtml({ originalHtml, registry, generated, stateModel, width, height });
  writeUtf8(outHtml, html);
  injectStateKeyNavIntoFile(outHtml);
  const shotsDir = path.join(outDir, "auto_shots");
  const shotReport = await screenshotStates({ htmlPath: outHtml, blueprint, model: stateModel, outDir: shotsDir, width, height });
  const ok = shotReport.summary.issues_found.length === 0;
  writeJson(path.join(outDir, "run_report.json"), { ok, generation_mode: generationMode, outputs: { html: rel(outHtml), auto_shots: rel(shotsDir), state_layers_report: rel(path.join(shotsDir, "state_layers_report.json")) }, screenshot_summary: shotReport.summary });
  console.log(`[llm-layer] ok=${ok} out=${rel(outHtml)}`);
  if (!ok) process.exitCode = 2;
}

main().catch((err) => {
  console.error("[llm-layer] ERROR:", err.stack || err.message);
  process.exit(1);
});
