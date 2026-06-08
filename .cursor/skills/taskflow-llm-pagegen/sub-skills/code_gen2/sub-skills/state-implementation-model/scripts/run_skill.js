#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../../../../../../..");
const SKILL_ROOT = path.resolve(__dirname, "../../../../..");

function readUtf8(file) {
  return fs.readFileSync(file, "utf8");
}

function writeUtf8(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function argValue(args, name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
}

function stateNum(id) {
  const match = String(id || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of readUtf8(file).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

function latestBlueprint(base) {
  const dir = path.join(base, "html");
  const hits = [];
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const name of fs.readdirSync(current)) {
      const file = path.join(current, name);
      const stat = fs.statSync(file);
      if (stat.isDirectory()) walk(file);
      else if (name === "blueprint_builder_input.json") hits.push(file);
    }
  }
  walk(dir);
  hits.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return hits[0];
}

function lightweightRegistry(registry) {
  const out = {};
  for (const [name, entry] of Object.entries(registry.semantic_dom_registry || {})) {
    out[name] = {
      selector: entry.selector,
      semantic: entry.component || entry.semantic,
      text: entry.text,
      area: entry.area,
      policy: entry.inheritance_policy,
    };
  }
  return out;
}

function anchorBboxes(registry) {
  const out = {};
  for (const [name, entry] of Object.entries(registry.semantic_dom_registry || {})) {
    out[name] = entry.bbox || null;
  }
  return out;
}

function layoutConstraints() {
  return [
    "Ordinary page cards should use weak layout hints instead of fixed bbox: layout.group, layout.order, layout.flow, layout.widthHint, layout.heightMode:auto, layout.startAnchor, and layout.spacingHint.",
    "Ordinary page cards should not invent exact x/y/height unless there is a clear visual anchor, fixed start point, two-column grid, sticky/floating behavior, or edge alignment requirement.",
    "Fixed containers must use bbox: Overlay, mask, BottomSheet, Drawer, Modal, Dialog, Toast, top nav, bottom bar, and floating action bars.",
    "If a state keeps a top/status anchor, fixed created content must start below that anchor bbox unless it is an intentional transparent/hero background; flow cards should use layout.startAnchor.",
    "If a state keeps a bottom/nav anchor, fixed created content must end above that anchor bbox; flow cards should use layout.endBeforeAnchor or a scrollable content group.",
    "If the state is not a modal, drawer, popover, toast, or overlay, every fixed created component bbox must avoid overlap with kept bboxes.",
    "Fixed body regions at the same z-index must be bbox-mutually exclusive. Status/top/nav/body/bottom regions must not overlap unless one is a higher-z overlay/modal/sheet or an intentional transparent hero background.",
    "Every modal/sheet/drawer/dialog layer must have its own global overlay/mask. Overlay z-index must be lower than its own surface and higher than content it dims.",
    "Toast is fixed feedback and does not require a global overlay/mask unless the blueprint explicitly asks for a blocking dialog.",
    "For stacked modals, the second-level overlay z-index must be higher than the first-level sheet/dialog z-index, and the second-level sheet/dialog z-index must be higher than the second-level overlay.",
    "Do not output hide or replace. The implementation model only contains keep, create, and update.",
    "Generated UI should support an antd Mobile visual style and Gestalt grouping.",
    "Prefer component names and props from component_library_reference. Use other component/container names only when no documented component fits the state requirement.",
    "Only top-level create/update patches need page-coordinate bbox. Children inside containers should describe their own props/text/intrinsic width/height instead of bbox.",
    "Parent containers own page placement and child layout. Child components are generated first and imported by the parent during codegen.",
    "Rich cards must be fully populated in state_implementation_model. Component-codegen only renders existing props/children/text and must not invent business data.",
  ];
}

function componentLibraryReference() {
  const file = path.resolve(__dirname, "../../../resources/components/README.md");
  if (!fs.existsSync(file)) return "";
  return readUtf8(file);
}

function ownString(obj, key) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === "string" ? obj[key] : null;
}

function patchAnchor(patch) {
  return ownString(patch, "target_anchor") || ownString(patch, "anchor") || ownString(patch, "target") || ownString(patch, "id") || null;
}

function gotoStateNum(value) {
  const match = String(value || "").match(/state[_-]?(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function patchGotoStateNum(patch) {
  return gotoStateNum(patch?.goto) || gotoStateNum(patch?.action);
}

function isClickAction(action) {
  return /(^|:)click$/i.test(String(action || "")) || /^tap$/i.test(String(action || ""));
}

function patchBottom(patch) {
  const bbox = Array.isArray(patch?.bbox) ? patch.bbox.map(Number) : [];
  const y = Number.isFinite(bbox[1]) ? bbox[1] : null;
  const h = Number.isFinite(bbox[3]) ? bbox[3] : null;
  return y == null || h == null ? 0 : y + h;
}

function patchChildren(patch) {
  return Array.isArray(patch?.children) ? patch.children : [];
}

function collectPatchIds(patch, out = []) {
  const id = patch?.id || patch?.name;
  if (id) out.push(id);
  for (const child of patchChildren(patch)) collectPatchIds(child, out);
  return out;
}

function registerPatchTree(patch, map) {
  const id = patch?.id || patch?.name;
  if (id) map.set(id, patch);
  for (const child of patchChildren(patch)) registerPatchTree(child, map);
}

function collectPatchRefs(patch, out = []) {
  const anchor = patchAnchor(patch);
  if (anchor) out.push(anchor);
  for (const child of patchChildren(patch)) collectPatchRefs(child, out);
  return out;
}

function collectTopLevelPatchIds(patch, out = []) {
  const id = patch?.id || patch?.name;
  if (id) out.push(id);
  return out;
}

function isContainerLike(patch) {
  return /sectionlayout|card|list|bottomsheet|drawer|modal|dialog|container|panel|wrapper|shell/i.test(String(patch?.component || patch?.id || ""));
}

function isFixedPlacementComponent(patch) {
  const value = `${patch?.component || ""} ${patch?.id || ""}`.toLowerCase();
  return /bottomsheet|drawer|modal|dialog|toast|popover|overlay|mask|topnav|bottomnav|buttonbar|bottom[_-]?bar|action[_-]?bar|tab[_-]?bar|floating|statusbar|softkeyboard|keyboard|ime/.test(value);
}

function isKeyboardPatch(patch) {
  return /softkeyboard|keyboard|ime|软键盘|键盘/i.test(`${patch?.component || ""} ${patch?.id || ""}`);
}

function isBottomActionPatch(patch) {
  return /buttonbar|bottomnav|bottom[_-]?bar|action[_-]?bar|footer[_-]?bar|底部.*按钮|底部.*操作/i.test(`${patch?.component || ""} ${patch?.id || ""}`);
}

function normalizeFixedViewportPatch(patch, initialHeight) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
  const viewportHeight = Number(initialHeight) || 936;
  const bbox = Array.isArray(patch.bbox) ? patch.bbox.map(Number) : [];
  if (isKeyboardPatch(patch)) {
    const width = Number.isFinite(bbox[2]) && bbox[2] > 0 ? bbox[2] : 360;
    const height = Number.isFinite(bbox[3]) && bbox[3] > 0 ? bbox[3] : 336;
    patch.bbox = [0, Math.max(0, viewportHeight - height), width, height];
    patch.props = { ...(patch.props || {}), layoutRole: "fixed-bottom-keyboard", zIndex: Math.max(Number(patch.props?.zIndex || 0), 90) };
  } else if (isBottomActionPatch(patch)) {
    const width = Number.isFinite(bbox[2]) && bbox[2] > 0 ? bbox[2] : 360;
    const height = Number.isFinite(bbox[3]) && bbox[3] > 0 ? bbox[3] : 64;
    patch.bbox = [0, Math.max(0, viewportHeight - height), width, height];
    patch.props = { ...(patch.props || {}), layoutRole: "fixed-bottom-action", zIndex: Math.max(Number(patch.props?.zIndex || 0), 80) };
  }
}

function mergeVirtualPlacement(patch, virtualPatchById) {
  const id = patch?.id || patch?.name;
  if (!id || !virtualPatchById.has(id)) return;
  const previous = virtualPatchById.get(id) || {};
  if (!patch.component && previous.component) patch.component = previous.component;
  if (!Array.isArray(patch.bbox) && Array.isArray(previous.bbox)) patch.bbox = previous.bbox.slice();
  if (!patch.layout && previous.layout) patch.layout = { ...previous.layout };
  patch.props = { ...(previous.props || {}), ...(patch.props || {}) };
}

function isOverlayLike(patch) {
  return /overlay|mask|scrim|遮罩/i.test(`${patch?.component || ""} ${patch?.id || ""}`);
}

function isToastLike(patch) {
  return /toast|snackbar|轻提示|提示条/i.test(`${patch?.component || ""} ${patch?.id || ""}`);
}

function isModalSurfaceLike(patch) {
  return /bottomsheet|drawer|modal|dialog|sheet|popup|popover|弹窗|抽屉/i.test(`${patch?.component || ""} ${patch?.id || ""}`);
}

function isStackingExempt(patch) {
  return isOverlayLike(patch) || isModalSurfaceLike(patch) || isToastLike(patch) || /hero|carousel|transparent/i.test(`${patch?.component || ""} ${patch?.id || ""}`);
}

function validBbox(patch) {
  const bbox = Array.isArray(patch?.bbox) ? patch.bbox.map(Number) : [];
  return bbox.length === 4 && bbox.every(Number.isFinite) && bbox[2] > 0 && bbox[3] > 0;
}

function bboxOf(patch) {
  return validBbox(patch) ? patch.bbox.map(Number) : null;
}

function bboxOverlap(a, b) {
  if (!a || !b) return false;
  return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
}

// True when `outer` fully contains `inner` (with a small tolerance). Used to
// exempt nested controls — e.g. a save/back TextButton sitting inside the top
// nav bar — from the same-z "region overlap" rule, which is meant to catch
// peer-level regions (status bar / nav / body / bottom bar) fighting for space,
// not a button legitimately nested within a bar.
function bboxContains(outer, inner, tol = 1) {
  if (!outer || !inner) return false;
  return outer[0] <= inner[0] + tol
    && outer[1] <= inner[1] + tol
    && outer[0] + outer[2] >= inner[0] + inner[2] - tol
    && outer[1] + outer[3] >= inner[1] + inner[3] - tol;
}

function bboxNested(a, b) {
  return bboxContains(a, b) || bboxContains(b, a);
}

function patchZIndex(patch) {
  const z = Number(patch?.props?.zIndex ?? patch?.zIndex ?? patch?.style?.zIndex ?? 0);
  return Number.isFinite(z) ? z : 0;
}

function hasWeakLayoutHints(patch) {
  const layout = patch?.layout;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return false;
  return Boolean(layout.heightMode || layout.flow || layout.group || layout.order != null || layout.widthHint || layout.startAnchor);
}

function collectContentSignals(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    if (text) out.push(text);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectContentSignals(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/^(id|type|component|className|fontSize|lineHeight|fontWeight|color|zIndex|width|height|x|y|order|flow|group|heightMode|widthHint|startAnchor|endBeforeAnchor|spacingHint)$/i.test(key)) continue;
      collectContentSignals(item, out);
    }
  }
  return out;
}

function richContentStats(patch) {
  const signals = collectContentSignals({
    text: patch.text,
    visible_text: patch.visible_text,
    props: patch.props,
    children: patch.children,
  });
  const unique = [...new Set(signals.filter((text) => !/^(true|false|null|undefined)$/i.test(text)))];
  const meaningful = unique.filter((text) => !/示例|内容\.\.\.|待补充|占位|placeholder|lorem/i.test(text));
  return {
    uniqueCount: unique.length,
    meaningfulCount: meaningful.length,
    totalLength: meaningful.join("").length,
    childCount: patchChildren(patch).length,
  };
}

function inferRequirementName(value, fallback) {
  return String(value || fallback || "")
    .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function normalizeRichContentRequirements(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
  if (String(patch.content_density || "").toLowerCase() === "rich") {
    const requirements = Array.isArray(patch.content_requirements)
      ? patch.content_requirements.filter((item) => typeof item === "string" && item.trim())
      : [];
    const inferred = [];
    for (const key of Object.keys(patch.props || {})) {
      if (/^(variant|className|zIndex|width|height)$/i.test(key)) continue;
      inferred.push(inferRequirementName(key));
    }
    for (const child of patchChildren(patch)) {
      inferred.push(inferRequirementName(child.id || child.name || child.component));
    }
    const next = [...new Set([...requirements, ...inferred].filter(Boolean))];
    while (next.length < 3 && patchChildren(patch).length) {
      next.push(`childContent${next.length + 1}`);
    }
    patch.content_requirements = next;
  }
  for (const child of patchChildren(patch)) normalizeRichContentRequirements(child);
}

function inferSectionTitle(patch) {
  const text = `${patch?.id || ""} ${patch?.name || ""} ${patch?.description || ""}`.toLowerCase();
  if (/doc|document|文档/.test(text) && /detail|content|详情|内容/.test(text)) return "文档详情";
  if (/doc|document|文档/.test(text)) return "文档列表";
  if (/risk|风险/.test(text)) return "风险提示";
  if (/product|产品/.test(text)) return "产品信息";
  if (/service|售后|服务/.test(text)) return "服务信息";
  if (/comment|qa|问答|评论/.test(text)) return "评论/问答";
  if (/tool|工具/.test(text)) return "工具";
  if (/overview|概览/.test(text)) return "概览";
  const firstTextChild = patchChildren(patch).find((child) => typeof child?.text === "string" && child.text.trim());
  if (firstTextChild) return firstTextChild.text.trim().slice(0, 20);
  return "内容";
}

function normalizeComponentProps(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
  if (String(patch.component || "").toLowerCase() === "sectionlayout") {
    patch.props = patch.props && typeof patch.props === "object" && !Array.isArray(patch.props) ? patch.props : {};
    if (!patch.props.variant) patch.props.variant = "card";
    if (!patch.props.title) patch.props.title = inferSectionTitle(patch);
  }
  const schema = componentSchema(patch.component);
  if (schema && patch.props && typeof patch.props === "object" && !Array.isArray(patch.props)) {
    const allowed = new Set([...schema.required, ...schema.optional]);
    for (const key of Object.keys(patch.props)) {
      if (!allowed.has(key)) delete patch.props[key];
    }
  }
  for (const child of patchChildren(patch)) normalizeComponentProps(child);
}

function componentSchema(name) {
  const key = String(name || "").toLowerCase();
  const schemas = {
    sectionlayout: { required: ["variant", "title"], optional: ["moreText", "onMore", "tabs", "activeTab", "onTabChange", "headerRightAction"] },
    topnav: { required: [], optional: ["variant", "onBack", "activeTab", "tabs", "onTabChange", "title", "drawerValue", "drawerOptions", "onDrawerChange", "drawerDefaultOpen", "actions", "cartCount", "onSearch", "onCart", "onProfile", "onScan", "onMessage", "onSettings", "onGrid", "transparent", "zIndex"] },
    capsulebutton: { required: [], optional: ["children", "size", "variant", "disabled", "icon", "className", "onClick", "loading", "block", "zIndex"] },
    textbutton: { required: [], optional: ["children", "size", "variant", "disabled", "icon", "className", "onClick", "zIndex"] },
    buttonbar: { required: ["variant"], optional: ["primaryLabel", "secondaryLabel", "thirdLabel", "inputPlaceholder", "checkboxLabel", "width", "className", "onPrimaryClick", "onSecondaryClick", "onThirdClick", "zIndex"] },
    inputdemo: { required: [], optional: ["label", "placeholder", "errorMessage", "value", "onChange", "validate", "disabled", "showToggle", "className", "zIndex"] },
    statuspill: { required: ["text"], optional: ["colorMap", "zIndex"] },
    filterpills: { required: ["filters", "activeId"], optional: ["onChange", "fadeEdges", "zIndex"] },
    leftsidebar: { required: ["filters", "activeId"], optional: ["onChange", "zIndex"] },
    productlayout: { required: ["filters", "activeFilter", "subFilters", "activeSubFilter", "products"], optional: ["onFilterChange", "onSubFilterChange", "onProductClick", "onAddToCart", "zIndex"] },
    productcard: { required: ["product"], optional: ["onClick", "onAddToCart", "zIndex"] },
    productselectionlistitem: { required: ["item"], optional: ["onForward", "onMore", "onStatusChange", "isLast", "zIndex"] },
    courselistitem: { required: ["course"], optional: ["onClick", "renderMeta", "zIndex"] },
    hotvideocard: { required: ["title", "imageGradient"], optional: ["subtitle", "imageHeight", "width", "tag", "action", "onShare", "onClick", "zIndex"] },
    icongrid: { required: ["cols", "items"], optional: ["title", "variant", "emptyText", "zIndex"] },
    quickentrygrid: { required: ["items"], optional: ["title", "zIndex"] },
    entrycard: { required: ["card"], optional: ["width", "height", "zIndex"] },
    morebutton: { required: [], optional: ["onClick", "text", "zIndex"] },
    categorytabs: { required: ["categories", "activeId"], optional: ["onChange", "zIndex"] },
    underlinetabs: { required: ["tabs", "activeId"], optional: ["onChange", "size", "className", "zIndex"] },
    statusbar: { required: [], optional: ["zIndex"] },
    bottomnav: { required: [], optional: ["zIndex"] },
  };
  return schemas[key] || null;
}

// Protocol-level metadata props. These are injected by the runner
// (normalizeFixedViewportPatch) or mandated by the page-layer contract / SKILL,
// and are valid on any component regardless of its documented business props.
const META_PROPS = ["layoutRole", "zIndex", "textStyles"];

function validateComponentProps(patch, stateId, issues) {
  const schema = componentSchema(patch?.component);
  if (!schema) return;
  const props = patch.props || {};
  const allowed = new Set([...schema.required, ...schema.optional, ...META_PROPS]);
  for (const key of Object.keys(props)) {
    if (!allowed.has(key)) {
      issues.push(`${stateId}.${patch.id || patch.name || patch.component} unknown prop "${key}" for ${patch.component}`);
    }
  }
  for (const key of schema.required) {
    const satisfiedByTopLevelText = key === "text" && typeof patch.text === "string" && patch.text.trim();
    if (props[key] == null && !satisfiedByTopLevelText) {
      issues.push(`${stateId}.${patch.id || patch.name || patch.component} missing required prop "${key}" for ${patch.component}`);
    }
  }
}

function hasStructuredContainerContent(patch) {
  return patchChildren(patch).length > 0;
}

function normalizeNestedChildLayout(patch, depth = 0) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
  if (depth > 0 && Array.isArray(patch.bbox)) {
    const bbox = patch.bbox.map(Number);
    patch.props = patch.props && typeof patch.props === "object" && !Array.isArray(patch.props) ? patch.props : {};
    if (patch.props.width == null && Number.isFinite(bbox[2])) patch.props.width = bbox[2];
    if (patch.props.height == null && Number.isFinite(bbox[3])) patch.props.height = bbox[3];
    delete patch.bbox;
  }
  for (const child of patchChildren(patch)) normalizeNestedChildLayout(child, depth + 1);
}

function validatePatchShape(patch, stateId, issues, depth = 0) {
  if (!patch || typeof patch !== "object") return;
  if (patch.type === "bind" || patch.type === "keep") return;
  validateComponentProps(patch, stateId, issues);
  const isUpdatePatch = patch.type === "update";
  if (depth === 0 && !isUpdatePatch) {
    if (isFixedPlacementComponent(patch) && !validBbox(patch)) {
      issues.push(`${stateId}.${patch.id || patch.name || patch.component} fixed component requires valid bbox`);
    }
    if (!isFixedPlacementComponent(patch) && !validBbox(patch) && !hasWeakLayoutHints(patch)) {
      issues.push(`${stateId}.${patch.id || patch.name || patch.component} ordinary top-level component requires bbox or weak layout hints`);
    }
  }
  if (String(patch.content_density || "").toLowerCase() === "rich") {
    const requirements = Array.isArray(patch.content_requirements) ? patch.content_requirements : [];
    const stats = richContentStats(patch);
    if (requirements.length < 3) {
      issues.push(`${stateId}.${patch.id || patch.name || patch.component} rich card requires at least 3 content_requirements`);
    }
    if (stats.meaningfulCount < 4 || stats.totalLength < 32) {
      issues.push(`${stateId}.${patch.id || patch.name || patch.component} rich card lacks enough concrete business content in state model`);
    }
  }
  if (String(patch.component || "").toLowerCase() === "sectionlayout" && patchChildren(patch).length === 0) {
    issues.push(`${stateId}.${patch.id || patch.name || "SectionLayout"} SectionLayout requires non-empty children`);
  }
  if (isContainerLike(patch) && typeof patch.text === "string" && patch.text.trim() && !hasStructuredContainerContent(patch)) {
    issues.push(`${stateId}.${patch.id || patch.name || "component"} container must not use top-level text without children`);
  }
  for (const child of patchChildren(patch)) validatePatchShape(child, stateId, issues, depth + 1);
}

function stateContentBottom(state) {
  let bottom = 0;
  for (const patch of state.inheritance?.create || []) bottom = Math.max(bottom, patchBottom(patch));
  for (const patch of state.inheritance?.update || []) bottom = Math.max(bottom, patchBottom(patch));
  for (const patch of state.patches || []) {
    if (patch?.type === "create" || patch?.type === "update") bottom = Math.max(bottom, patchBottom(patch));
  }
  return bottom;
}

function validateStateStacking(state, registry, virtualPatches, issues) {
  const fixed = [];
  function addFixed(patch, source) {
    if (!patch || !validBbox(patch)) return;
    fixed.push({ patch, source, id: patch.id || patch.name || patch.component || source, bbox: bboxOf(patch), z: patchZIndex(patch) });
  }

  for (const anchor of state.inheritance?.keep || []) {
    if (typeof anchor !== "string") continue;
    const virtual = virtualPatches.get(anchor);
    if (virtual) {
      addFixed(virtual, "keep");
      continue;
    }
    const entry = registry.semantic_dom_registry?.[anchor];
    if (entry?.bbox) {
      addFixed({ id: anchor, component: entry.component || entry.semantic || "kept_anchor", bbox: entry.bbox, props: { zIndex: 0 } }, "original_keep");
    }
  }
  for (const patch of state.inheritance?.create || []) addFixed(patch, "create");
  for (const patch of state.inheritance?.update || []) addFixed(patch, "update");

  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i];
      const b = fixed[j];
      if (a.source === "original_keep" && b.source === "original_keep") continue;
      if (a.z !== b.z) continue;
      if (isStackingExempt(a.patch) || isStackingExempt(b.patch)) continue;
      if (a.id === b.id) continue;
      if (bboxNested(a.bbox, b.bbox)) continue;
      if (bboxOverlap(a.bbox, b.bbox)) {
        issues.push(`${state.id} fixed same-z bbox overlap: ${a.id} and ${b.id} at zIndex ${a.z}`);
      }
    }
  }

  const overlays = fixed.filter((item) => isOverlayLike(item.patch));
  const surfaces = fixed.filter((item) => isModalSurfaceLike(item.patch) && !isOverlayLike(item.patch));
  for (const surface of surfaces) {
    const coveringOverlay = overlays
      .filter((overlay) => overlay.z < surface.z && bboxOverlap(overlay.bbox, surface.bbox))
      .sort((a, b) => b.z - a.z)[0];
    if (!coveringOverlay) {
      issues.push(`${state.id}.${surface.id} modal/sheet surface requires a lower-z global overlay covering it`);
    }
  }

  const inheritedSurfaceMaxZ = Math.max(
    -Infinity,
    ...fixed.filter((item) => item.source === "keep" && isModalSurfaceLike(item.patch) && !isOverlayLike(item.patch)).map((item) => item.z)
  );
  if (Number.isFinite(inheritedSurfaceMaxZ)) {
    const currentOverlays = overlays.filter((item) => item.source === "create" || item.source === "update");
    const currentSurfaces = surfaces.filter((item) => item.source === "create" || item.source === "update");
    if (currentSurfaces.length) {
      const raisedOverlay = currentOverlays.find((overlay) => overlay.z > inheritedSurfaceMaxZ);
      if (!raisedOverlay) {
        issues.push(`${state.id} stacked modal requires a new overlay zIndex greater than inherited modal zIndex ${inheritedSurfaceMaxZ}`);
      }
      for (const surface of currentSurfaces) {
        const overlay = currentOverlays.filter((item) => item.z < surface.z).sort((a, b) => b.z - a.z)[0];
        if (!overlay) issues.push(`${state.id}.${surface.id} stacked modal surface zIndex must be greater than its current overlay`);
      }
    }
  }
}

function normalizeModel(model, initialHeight) {
  delete model.semanticAnchors;
  delete model.semantic_registry;

  const virtualPatchById = new Map();
  for (const state of model.states || []) {
    if (!state.trigger || typeof state.trigger !== "object" || Array.isArray(state.trigger)) state.trigger = null;
    if (stateNum(state.id) === 1 && !state.parent_state) state.trigger = null;

    const patchList = Array.isArray(state.patches) ? state.patches : [];
    const inheritance = state.inheritance && typeof state.inheritance === "object" && !Array.isArray(state.inheritance) ? state.inheritance : {};
    const keep = new Set(inheritance.keep || []);
    const create = Array.isArray(inheritance.create) ? inheritance.create.slice() : [];
    const update = Array.isArray(inheritance.update) ? inheritance.update.slice() : [];

    for (const patch of patchList) {
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) continue;
      const anchor = patchAnchor(patch);
      if (patch.type === "keep" && anchor) keep.add(anchor);
      if (patch.type === "create") create.push(patch);
      if (patch.type === "update") update.push(patch);
      if (patch.type === "bind" && anchor) {
        const targetNum = patchGotoStateNum(patch);
        if (!patch.goto && targetNum) patch.goto = `state_${targetNum}`;
        if (!state.trigger && stateNum(state.id) > 1 && targetNum === stateNum(state.id)) {
          state.trigger = { event: patch.event || "click", anchor, action: isClickAction(patch.action) ? "click" : (patch.action || "click"), goto: state.id };
        }
      }
    }

    if (state.trigger && /^goto:/i.test(String(state.trigger.action || ""))) {
      state.trigger.action = `goto:${state.id}`;
    }
    if (state.trigger && stateNum(state.id) > 1) {
      const action = String(state.trigger.action || state.trigger.event || "");
      if (isClickAction(action) || /^goto:/i.test(String(state.trigger.action || ""))) {
        state.trigger.goto = state.id;
      }
    }

    state.inheritance = { keep: [...keep], create, update };
    state.patches = patchList.filter((patch) => patch?.type !== "hide" && patch?.type !== "replace");
    for (const patch of state.inheritance.create) {
      normalizeNestedChildLayout(patch);
      normalizeComponentProps(patch);
      normalizeRichContentRequirements(patch);
      normalizeFixedViewportPatch(patch, initialHeight);
      registerPatchTree(patch, virtualPatchById);
    }
    for (const patch of state.inheritance.update) {
      mergeVirtualPlacement(patch, virtualPatchById);
      normalizeNestedChildLayout(patch);
      normalizeComponentProps(patch);
      normalizeRichContentRequirements(patch);
      normalizeFixedViewportPatch(patch, initialHeight);
      if (patch?.id || patch?.name) {
        const id = patch.id || patch.name;
        virtualPatchById.set(id, { ...(virtualPatchById.get(id) || {}), ...patch, props: { ...((virtualPatchById.get(id) || {}).props || {}), ...(patch.props || {}) } });
      }
    }
    for (const patch of state.patches) {
      normalizeNestedChildLayout(patch);
      normalizeComponentProps(patch);
      normalizeRichContentRequirements(patch);
      normalizeFixedViewportPatch(patch, initialHeight);
    }
    const requestedHeight = Number(state.height);
    const contentHeight = stateContentBottom(state);
    state.height = Math.max(
      Number(initialHeight) || 0,
      Number.isFinite(requestedHeight) ? requestedHeight : 0,
      contentHeight
    );
  }

  return model;
}

function validateModel(model, registry) {
  const issues = [];
  const originalAnchors = new Set(Object.keys(registry.semanticAnchors || {}));
  const virtualAnchors = new Set();
  const virtualPatches = new Map();

  if (!Array.isArray(model.states)) issues.push("missing states[]");
  const sorted = [...(model.states || [])].sort((a, b) => stateNum(a.id) - stateNum(b.id));

  function isSystemTrigger(trigger) {
    if (!trigger || typeof trigger !== "object") return false;
    return /timeout|load_complete|submit_success|system|auto|data_loaded|success|完成|系统|自动/i.test(JSON.stringify(trigger));
  }

  for (const state of sorted) {
    if (!state.id) issues.push("state missing id");
    if (!Number.isFinite(Number(state.height)) || Number(state.height) <= 0) issues.push(`${state.id} missing numeric height`);
    const contentBottom = stateContentBottom(state);
    if (Number(state.height || 0) < contentBottom) issues.push(`${state.id} height ${state.height} smaller than content bottom ${contentBottom}`);
    if (stateNum(state.id) > 1 && !state.parent_state) issues.push(`${state.id} missing parent_state`);
    if (stateNum(state.id) === 1 && !state.parent_state && state.trigger) issues.push(`${state.id} initial state must not define trigger`);
    if (stateNum(state.id) > 1 && state.trigger && !isSystemTrigger(state.trigger)) {
      const triggerAction = state.trigger.action || state.trigger.event;
      if (isClickAction(triggerAction)) {
        const triggerTarget = gotoStateNum(state.trigger.goto) || gotoStateNum(state.trigger.action);
        if (triggerTarget !== stateNum(state.id)) {
          issues.push(`${state.id} click trigger must explicitly goto its own state id`);
        }
      }
    }
    if (state.inheritance?.hide) issues.push(`${state.id} must not output inheritance.hide`);
    if (state.inheritance?.replace) issues.push(`${state.id} must not output inheritance.replace`);
    for (const patch of state.inheritance?.create || []) validatePatchShape(patch, state.id, issues);
    for (const patch of state.inheritance?.update || []) validatePatchShape(patch, state.id, issues);
    for (const patch of state.patches || []) validatePatchShape(patch, state.id, issues);
    validateStateStacking(state, registry, virtualPatches, issues);

    const refs = [];
    if (state.trigger?.anchor && !isSystemTrigger(state.trigger)) refs.push(state.trigger.anchor);
    for (const item of state.inheritance?.keep || []) {
      const anchor = typeof item === "string" ? item : patchAnchor(item);
      if (anchor) refs.push(anchor);
    }
    for (const patch of state.inheritance?.update || []) {
      const anchor = patchAnchor(patch);
      if (anchor) refs.push(anchor);
    }
    for (const anchor of refs) {
      if (typeof anchor !== "string" || (!originalAnchors.has(anchor) && !virtualAnchors.has(anchor))) {
        issues.push(`${state.id} references unknown anchor: ${anchor}`);
      }
    }
    for (const patch of state.inheritance?.create || []) {
      collectPatchIds(patch).forEach((id) => virtualAnchors.add(id));
      registerPatchTree(patch, virtualPatches);
    }
    for (const patch of state.inheritance?.update || []) {
      const id = patch?.id || patch?.name;
      if (id && virtualPatches.has(id)) {
        virtualPatches.set(id, { ...virtualPatches.get(id), ...patch, props: { ...(virtualPatches.get(id).props || {}), ...(patch.props || {}) } });
      }
    }
    for (const patch of state.patches || []) {
      if (patch.type === "create") {
        collectPatchIds(patch).forEach((id) => virtualAnchors.add(id));
        registerPatchTree(patch, virtualPatches);
      }
      if (patch.type === "bind" && !patchGotoStateNum(patch)) issues.push(`${state.id} bind patch must include explicit goto state target`);
      if (patch.type === "hide" || patch.type === "replace") issues.push(`${state.id} must not contain ${patch.type} patch`);
    }
  }

  return issues;
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
          temperature: 0.2,
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

async function main() {
  const args = process.argv.slice(2);
  const base = path.resolve(ROOT, args[0] || "new_test/2");
  const model = argValue(args, "--model", "qwen3.7-max");
  const width = Number(argValue(args, "--width", "360"));
  const height = Number(argValue(args, "--height", "792"));
  const blueprintPath = path.resolve(ROOT, argValue(args, "--blueprint", latestBlueprint(base)));
  const registryPath = path.resolve(ROOT, argValue(args, "--registry", path.join(base, ".preprocess", "semantic_registry.json")));
  const out = path.resolve(ROOT, argValue(args, "--out", path.join(base, ".run_skill", "state_implementation", "state_implementation_model.llm.json")));
  const skillPath = path.resolve(__dirname, "..", "SKILL.md");
  const skill = readUtf8(skillPath);
  const blueprint = JSON.parse(readUtf8(blueprintPath));
  const registry = JSON.parse(readUtf8(registryPath));
  const componentReference = componentLibraryReference();
  const skillInput = {
    viewport: {
      width,
      initial_height: height,
      width_locked: true,
      height_may_expand: true,
    },
    blueprint,
    semantic_registry: lightweightRegistry(registry),
    anchor_bboxes: anchorBboxes(registry),
    layout_constraints: layoutConstraints(),
    component_library_reference: componentReference,
  };

  writeUtf8(out.replace(/\.json$/, ".skill_input.json"), JSON.stringify(skillInput, null, 2));
  const raw = await callLLM({
    model,
    system: skill + "\n\nReturn JSON only.",
    user: JSON.stringify(skillInput),
    maxTokens: Number(argValue(args, "--max-tokens", "12000")),
  });
  writeUtf8(out.replace(/\.json$/, ".raw.txt"), raw);

  const parsed = normalizeModel(extractJson(raw), height);
  const issues = validateModel(parsed, registry);
  writeUtf8(out, JSON.stringify(parsed, null, 2));
  writeUtf8(out.replace(/\.json$/, ".validation.json"), JSON.stringify({ issues }, null, 2));
  if (issues.length) {
    console.error("[state-model-llm] validation issues:\n" + issues.join("\n"));
    process.exit(2);
  }
  console.log(`[state-model-llm] out=${out}`);
}

main().catch((err) => {
  console.error("[state-model-llm] ERROR:", err.stack || err.message);
  process.exit(1);
});
