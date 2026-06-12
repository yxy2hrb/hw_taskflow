"use strict";

const fs = require("fs");
const path = require("path");
const { renderReactCode } = require("../../../scripts/react_ssr");

const ROOT = path.resolve(__dirname, "../../../../../../../..");
const SKILL_ROOT = path.resolve(__dirname, "../../../../..");

function readUtf8(file) { return fs.readFileSync(file, "utf8"); }
function readJson(file) { return JSON.parse(readUtf8(file).replace(/^\uFEFF/, "")); }
function writeUtf8(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text, "utf8"); }
function writeJson(file, value) { writeUtf8(file, JSON.stringify(value, null, 2)); }
function exists(file) { return fs.existsSync(file); }
function argValue(args, name, fallback) { const idx = args.indexOf(name); return idx >= 0 ? args[idx + 1] : fallback; }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, "/"); }

function loadDotEnv(file) {
  if (!exists(file)) return;
  for (const line of readUtf8(file).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
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
          temperature: Number(process.env.MODEL_TEMPERATURE ?? 0.15),
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

function componentText(component) {
  const visible = component.visible_text;
  if (typeof visible === "string") return visible;
  if (visible && typeof visible === "object") return Object.values(visible).flat().join(" ");
  return component.text || component.description || "";
}

function fallbackComponent({ component, operation, originalComponent, generatedChildren = [], isTopLevel = false }) {
  const id = component.id || component.name || "component";
  const bbox = Array.isArray(component.bbox) ? component.bbox : [0, 0, 120, 40];
  const kind = String(component.component || "component").toLowerCase();
  const text = componentText(component) || (operation === "update" && originalComponent?.text) || "";
  const hasBbox = Array.isArray(component.bbox);
  const explicitWidth = component.props?.width ?? component.width;
  const width = explicitWidth ?? (isTopLevel ? "100%" : bbox[2] || 120);
  const height = Number(component.props?.height || component.height || bbox[3] || 40);
  const reactWidth = typeof width === "number" ? String(width) : JSON.stringify(width);
  const cssWidth = typeof width === "number" ? `${width}px` : String(width);
  const style = hasBbox
    ? `position:absolute;left:${Number(bbox[0] || 0)}px;top:${Number(bbox[1] || 0)}px;width:${Number(bbox[2] || 0)}px;height:${Number(bbox[3] || 0)}px;`
    : `position:relative;width:${cssWidth};min-height:${height}px;`;
  const cls = kind.includes("button") ? "tf-cg-button" : kind.includes("input") ? "tf-cg-input" : kind.includes("toast") ? "tf-cg-toast" : "tf-cg-card";
  const childImports = generatedChildren.map((child) => `import ${child.importName} from ${JSON.stringify(child.importPath)};`);
  const childJsx = generatedChildren.map((child) => `        <${child.importName} />`).join("\n");
  const reactCode = [
    "import React from \"react\";",
    ...childImports,
    "",
    "export default function GeneratedComponent() {",
    "  return (",
    `    <div data-component-id=${JSON.stringify(id)} className={${JSON.stringify(`tf-component ${cls}`)}} style={${hasBbox ? `{ position: "absolute", left: ${Number(bbox[0] || 0)}, top: ${Number(bbox[1] || 0)}, width: ${Number(bbox[2] || 0)}, height: ${Number(bbox[3] || 0)} }` : `{ position: "relative", width: ${reactWidth}, minHeight: ${height} }`}}>`,
    childJsx || `      {${JSON.stringify(text)}}`,
    "    </div>",
    "  );",
    "}",
  ].join("\n");
  return {
    id,
    reactCode,
    html: `<div data-component-id="${id}" class="tf-component ${cls}" style="${style}">${text}</div>`,
    css: ".tf-cg-card{background:#fff;border:1px solid #f0f0f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);padding:12px 16px;box-sizing:border-box;color:#1f1f1f}.tf-cg-button{display:flex;align-items:center;justify-content:center;border-radius:10px;background:#1677ff;color:#fff;font-weight:600;box-sizing:border-box}.tf-cg-input{display:flex;align-items:center;background:#fff;border:1px solid #f0f0f0;border-radius:12px;padding:0 14px;box-sizing:border-box;color:#999}.tf-cg-toast{display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(0,0,0,.75);color:#fff;box-sizing:border-box}",
    notes: "fallback component",
  };
}

function validateComponent(parsed, id) {
  const issues = [];
  if (!parsed || typeof parsed !== "object") issues.push("response is not object");
  if (parsed.id && parsed.id !== id) issues.push(`id mismatch: expected ${id}, got ${parsed.id}`);
  if (typeof parsed.reactCode !== "string" || !parsed.reactCode.includes("export default")) issues.push("missing React default export");
  if (typeof parsed.reactCode === "string" && !parsed.reactCode.includes("data-component-id")) issues.push("React code missing data-component-id");
  if (typeof parsed.css !== "string") issues.push("missing css string");
  return issues;
}

function reactOnlyComponent(component) {
  if (!component) return null;
  return {
    id: component.id,
    reactCode: component.reactCode,
    notes: component.notes || "",
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function patchChildren(patch) {
  return Array.isArray(patch?.children) ? patch.children : [];
}

function safeName(name) {
  return String(name || "component").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function safeIdentifier(name, fallback) {
  const cleaned = String(name || fallback || "Child")
    .replace(/[^a-zA-Z0-9_$]/g, "_")
    .replace(/^[^a-zA-Z_$]/, "_$&");
  return cleaned || "Child";
}

function componentInputWithoutChildren(component, children) {
  const next = cloneJson(component);
  delete next.children;
  if (children.length) next.__hasChildren = true;
  return next;
}

function childImportMeta(record, child, index) {
  const id = componentRecordId(record) || child?.id || child?.name || `child_${index + 1}`;
  return {
    id,
    component: child?.component || null,
    importName: safeIdentifier(`Child_${safeName(id)}`, `Child${index + 1}`),
    importPath: `./${safeName(id)}`,
    props: child?.props || {},
    text: child?.text || child?.visible_text || null,
    description: child?.description || null,
  };
}

function componentName(component) {
  return String(component?.component || "").trim();
}

function componentRecordId(record) {
  return record?.component?.id || record?.input?.component?.id || record?.input?.component?.name || "";
}

function componentSourceCandidates(componentsDir, name) {
  const lower = String(name || "").toLowerCase();
  const direct = path.join(componentsDir, name, "index.tsx");
  const candidates = [];
  if (exists(direct)) candidates.push(direct);
  if (lower === "capsulebutton" || lower === "textbutton") candidates.push(path.join(componentsDir, "ui", "Button", "index.tsx"));
  if (lower === "buttonbar") candidates.push(path.join(componentsDir, "ButtonBar", "index.tsx"), path.join(componentsDir, "ui", "Button", "index.tsx"));
  if (lower === "sectionlayout") candidates.push(path.join(componentsDir, "SectionLayout", "index.tsx"), path.join(componentsDir, "SectionTitle", "index.tsx"), path.join(componentsDir, "UnderlineTabs", "index.tsx"), path.join(componentsDir, "MoreButton", "index.tsx"));
  if (lower === "productlayout") candidates.push(path.join(componentsDir, "ProductLayout", "index.tsx"), path.join(componentsDir, "LeftSidebar", "index.tsx"), path.join(componentsDir, "FilterPills", "index.tsx"), path.join(componentsDir, "ProductCard", "index.tsx"));
  return [...new Set(candidates)].filter(exists);
}

function componentReadmeSection(readme, name) {
  if (!readme || !name) return "";
  const aliases = {
    capsulebutton: "CapsuleButton",
    textbutton: "TextButton",
  };
  const title = aliases[String(name).toLowerCase()] || name;
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`((?:^|\\n)###\\s+\`${escaped}\`[\\s\\S]*?)(?=\\n###\\s+\`|\\n##\\s+|$)`);
  const match = readme.match(re);
  return match ? match[1].trim() : "";
}

function buildComponentLibSection({ resourcesDir, componentsDir, component }) {
  const globalCssPath = path.join(resourcesDir, "global.css");
  const readmePath = path.join(componentsDir, "README.md");
  const name = componentName(component);
  const sections = [];
  if (exists(globalCssPath)) {
    const cssVars = readUtf8(globalCssPath)
      .replace(/@import[^\n]+\n/g, "")
      .replace(/@tailwind[^\n]+\n/g, "");
    sections.push([
      "\n\n## Design System CSS Variables",
      "Use these CSS custom properties and static-safe utility classes in your output.",
      "```css",
      cssVars.trim(),
      "```",
    ].join("\n"));
  }
  if (exists(readmePath)) {
    const readme = readUtf8(readmePath);
    const section = componentReadmeSection(readme, name);
    if (section) {
      sections.push(["\n\n## Component Reference", section].join("\n"));
    }
  }
  const sourceFiles = componentSourceCandidates(componentsDir, name);
  if (sourceFiles.length) {
    sections.push([
      "\n\n## Relevant Component Source",
      "Use these as actual React component building blocks and follow their documented props.",
      "```tsx",
      sourceFiles.map((file) => `// ${path.relative(componentsDir, file)}\n${readUtf8(file)}`).join("\n\n---\n\n"),
      "```",
    ].join("\n"));
  } else {
    sections.push([
      "\n\n## Component Reference",
      `No documented component source was found for component "${name}". Generate a custom component only if no documented component fits.`,
    ].join("\n"));
  }
  return sections.join("\n");
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function runNext() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runNext);
  await Promise.all(workers);
  return results;
}

async function renderComponentRecord(parsed, { id, outDir }) {
  const rendered = await renderReactCode({
    id,
    reactCode: parsed.reactCode,
    css: parsed.css || "",
    outDir,
  });
  return {
    ...parsed,
    html: rendered.html,
    css: rendered.css,
    render: {
      mode: "react-ssr",
      source_file: rel(rendered.sourceFile),
      bundle_file: rel(rendered.bundleFile),
    },
  };
}

function mergeChildCss(parsed, childRecords) {
  const childCss = childRecords
    .map((record) => record?.component?.css)
    .filter((css) => typeof css === "string" && css.trim());
  if (!childCss.length) return parsed;
  return {
    ...parsed,
    css: [parsed.css || "", ...childCss].filter(Boolean).join("\n\n"),
  };
}

async function generateComponentRecord({ component, operation, originalComponent, generatedChildren, childRecords, stateContext, viewport, modelName, skill, resourcesDir, componentsDir, maxTokens, useFallback, outDir, rawDir, isTopLevel }) {
  const id = component.id || component.name;
  const input = operation === "update"
    ? { operation, viewport, state_context: stateContext, component, generated_children: generatedChildren || [], original_component: reactOnlyComponent(originalComponent), is_top_level: Boolean(isTopLevel) }
    : { operation, viewport, state_context: stateContext, component, generated_children: generatedChildren || [], is_top_level: Boolean(isTopLevel) };
  let parsed;
  let raw = "";
  let issues = [];
  if (useFallback) {
    parsed = fallbackComponent({ component, operation, originalComponent, generatedChildren, isTopLevel });
  } else {
    const systemPrompt = [
      skill,
      buildComponentLibSection({ resourcesDir, componentsDir, component }),
      `\n\nIn the "notes" field, list which component reference/source and CSS variables you used (e.g. "used ${componentName(component)}, --color-primary, --radius-md"). Return JSON only.`,
    ].join("");
    raw = await callLLM({ model: modelName, system: systemPrompt, user: JSON.stringify(input), maxTokens });
    parsed = extractJson(raw);
  }
  parsed = mergeChildCss(parsed, childRecords || []);
  issues = validateComponent(parsed, id);
  if (issues.length) parsed = mergeChildCss(fallbackComponent({ component, operation, originalComponent, generatedChildren, isTopLevel }), childRecords || []);
  try {
    parsed = await renderComponentRecord(parsed, { id, outDir });
  } catch (err) {
    issues.push("react render failed: " + err.message);
    parsed = await renderComponentRecord(mergeChildCss(fallbackComponent({ component, operation, originalComponent, generatedChildren, isTopLevel }), childRecords || []), { id, outDir });
  }
  if (raw) writeUtf8(path.join(rawDir, `${stateContext.id}_${operation}_${id}.raw.txt`), raw);
  return { state_id: stateContext.id, operation, original_component_id: originalComponent?.id || null, component: parsed, input, issues };
}

async function generatePatchTree({ patch, operation, depth, generatedById, stateContext, viewport, modelName, skill, resourcesDir, componentsDir, maxTokens, useFallback, outDir, rawDir }) {
  const children = patchChildren(patch);
  const directChildResults = [];
  const allRecords = [];
  for (const child of children) {
    const childOperation = child.type === "update" ? "update" : "create";
    const childId = child.id || child.name;
    const childResult = await generatePatchTree({
      patch: child,
      operation: childOperation,
      depth: depth + 1,
      generatedById,
      stateContext,
      viewport,
      modelName,
      skill,
      resourcesDir,
      componentsDir,
      maxTokens,
      useFallback,
      outDir,
      rawDir,
    });
    directChildResults.push(childResult);
    for (const record of childResult.allRecords) allRecords.push(record);
    if (childId && childResult.record) generatedById[childId] = childResult.record.component;
  }

  const component = componentInputWithoutChildren(patch, children);
  const generatedChildren = directChildResults.map((result, index) => childImportMeta(result.record, children[index], index));
  const childRecords = directChildResults.flatMap((result) => result.allRecords);
  const id = component.id || component.name;
  const record = await generateComponentRecord({
    component,
    operation,
    originalComponent: operation === "update" ? generatedById[id] || null : null,
    generatedChildren,
    childRecords,
    stateContext,
    viewport,
    modelName,
    skill,
    resourcesDir,
    componentsDir,
    maxTokens,
    useFallback,
    outDir,
    rawDir,
    isTopLevel: depth === 0,
  });
  allRecords.push(record);
  if (id) generatedById[id] = record.component;
  return { record, allRecords };
}

async function main() {
  const args = process.argv.slice(2);
  const base = path.resolve(ROOT, args[0] || ".");
  const modelName = argValue(args, "--model", "qwen3.7-max");
  const stateModelPath = path.resolve(ROOT, argValue(args, "--state-model", path.join(base, ".run_skill/latest/state_implementation/state_implementation_model.llm.json")));
  const outDir = path.resolve(ROOT, argValue(args, "--out-dir", path.join(base, ".run_skill", "component_codegen")));
  const width = Number(argValue(args, "--width", "360"));
  const height = Number(argValue(args, "--height", "792"));
  const maxTokens = Number(argValue(args, "--max-tokens", "5000"));
  const useFallback = args.includes("--fallback");
  const concurrency = Number(argValue(args, "--concurrency", "8"));

  const stateModel = readJson(stateModelPath);
  const skill = readUtf8(path.resolve(__dirname, "..", "SKILL.md"));

  const resourcesDir = path.resolve(__dirname, "../../../resources");
  const componentsDir = path.join(resourcesDir, "components");
  const generatedById = {};
  const components = [];
  const rawDir = path.join(outDir, "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  for (const state of stateModel.states || []) {
    const stateContext = { id: state.id, label: state.label, ui_intent: state.ui_intent, parent_state: state.parent_state, height: state.height || height };
    const viewport = { width, initial_height: height };
    const createPatches = (state.inheritance?.create || []).filter((component) => component.id || component.name);
    const createResults = await mapLimit(
      createPatches,
      concurrency,
      (patch) => generatePatchTree({ patch, operation: "create", depth: 0, generatedById, stateContext, viewport, modelName, skill, resourcesDir, componentsDir, maxTokens, useFallback, outDir, rawDir })
    );
    for (const result of createResults) {
      for (const record of result.allRecords) components.push(record);
    }

    const updatePatches = (state.inheritance?.update || []).filter((component) => component.id || component.name);
    const updateResults = await mapLimit(
      updatePatches,
      concurrency,
      (patch) => generatePatchTree({ patch, operation: "update", depth: 0, generatedById, stateContext, viewport, modelName, skill, resourcesDir, componentsDir, maxTokens, useFallback, outDir, rawDir })
    );
    for (const result of updateResults) {
      for (const record of result.allRecords) components.push(record);
    }
  }

  const output = { ok: true, source_state_model: rel(stateModelPath), components };
  writeJson(path.join(outDir, "component_codegen.generated.json"), output);
  writeJson(path.join(outDir, "run_report.json"), { ok: true, component_count: components.length, output: rel(path.join(outDir, "component_codegen.generated.json")) });
  console.log(`[component-codegen] ok=true components=${components.length} out=${rel(path.join(outDir, "component_codegen.generated.json"))}`);
}

main().catch((err) => {
  console.error("[component-codegen] ERROR:", err.stack || err.message);
  process.exit(1);
});
