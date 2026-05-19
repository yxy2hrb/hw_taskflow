const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs/promises");
const path = require("path");
const { HIFI_RENDER_SYSTEM_PROMPT, buildHiFiRenderUserPrompt, toSharedFuncName } = require("./prompts/hifiRenderPrompt");
const { HARMONY_TOKENS, HARMONY_FIXED_THEME, HARMONY_SPEC_PROMPT_BLOCK, HARMONY_COMPONENT_LIB_CODE } = require("./prompts/harmonySpec");
const taskflowOneClick = require("./taskflowOneClick");
const pixsoRoutes = require("./pixsoRoutes");
const {
  IA_SYSTEM_PROMPT,
  buildPhase1Prompt, buildPhase2Prompt, buildPhase3Prompt,
  buildPhase4Prompt, buildPhase5PrdPrompt,
  buildIaTopology, buildPageListFromIA,
} = require("./prompts/iaArchitectPrompt");

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json({ limit: "30mb" }));

const sessions = new Map();

// 线框组件 type → 中文标签映射（当 AI 未生成中文 label 时作为兜底）
const COMP_TYPE_ZH = {
  status_bar:      "状态栏",
  nav_bar:         "顶部导航",
  navigation_bar:  "顶部导航",
  app_bar:         "顶部导航",
  search:          "搜索栏",
  tabs:            "标签栏",
  banner:          "横幅区",
  list:            "列表区",
  card_grid:       "卡片网格",
  content:         "内容区",
  form:            "表单区",
  button:          "操作按钮",
  bottom_nav:      "底部导航",
  tab_bar:         "底部导航",
};

/** 获取区块的中文显示名 */
function getCompLabelZh(sec) {
  const lbl = sec.label || "";
  // 若 label 与 type 相同（英文）或为空，则走映射兜底
  if (!lbl || lbl === sec.type || /^[a-z_]+$/.test(lbl)) {
    return COMP_TYPE_ZH[sec.type] || sec.type;
  }
  return lbl;
}

// ─── LLM ─────────────────────────────────────────────────────────────────────
// 文本基座：阿里云 DashScope qwen-plus
const MODEL = process.env.TEXT_MODEL || "qwen-plus";
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const llm = new OpenAI({
  apiKey: DASHSCOPE_API_KEY,
  baseURL: DASHSCOPE_BASE_URL,
});

// 视觉模型：DashScope qwen-vl-max（与文本基座同 key 同端点，单独留一个客户端便于以后拆分）
const VISION_MODEL = process.env.VISION_MODEL || "qwen-vl-max";
const visionLlm = new OpenAI({
  apiKey: DASHSCOPE_API_KEY,
  baseURL: DASHSCOPE_BASE_URL,
});

function extractJSON(raw) {
  if (!raw) return null;
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const md = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (md) text = md[1].trim();
  // match object or array
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (m) text = m[0];
  try { return JSON.parse(text); } catch { return null; }
}

async function callJSON(system, user, { temperature = 0.7 } = {}) {
  try {
    const res = await llm.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature,
    });
    return extractJSON(res.choices[0].message.content);
  } catch (e) { console.error("[LLM-JSON]", e.message); return null; }
}

async function callText(system, user, { temperature = 0.6, maxTokens = null } = {}) {
  try {
    const messages = [];
    if (system && String(system).trim()) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: user });
    const payload = {
      model: MODEL,
      messages,
      temperature,
    };
    if (maxTokens != null && Number.isFinite(maxTokens)) payload.max_tokens = maxTokens;
    const res = await llm.chat.completions.create(payload);
    return res.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  } catch (e) { console.error("[LLM-TEXT]", e.message); return null; }
}

function extractRenderFunction(raw) {
  if (!raw || typeof raw !== "string") return "";
  const cleaned = raw.replace(/```(?:javascript|js)?/gi, "").replace(/```/g, "").trim();
  // Must contain a render function; return the full code (including helper functions)
  if (!cleaned.includes("function render")) return "";
  return cleaned;
}

/**
 * 从 AI 生成的 renderCode 中提取所有 Shared_xxx 函数定义。
 * 返回 { [funcName]: "function Shared_xxx(p){...}" }
 */
function extractSharedFunctions(code) {
  if (!code || typeof code !== "string") return {};
  const functions = {};
  const regex = /function\s+(Shared_[A-Za-z0-9_]+)\s*\(/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    const name = m[1];
    const start = m.index;
    let depth = 0;
    let end = start;
    for (let i = start; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end > start) functions[name] = code.slice(start, end);
  }
  return functions;
}

/**
 * 确保 renderCode 自包含：将它调用但未定义的 Shared_xxx 函数从缓存中前置注入。
 */
function ensureSelfContained(code, sharedComponentsCache) {
  if (!code) return code;
  const missing = [];
  for (const [fname, fcode] of Object.entries(sharedComponentsCache)) {
    const isUsed = code.includes(fname);
    const isDefined = new RegExp(`function\\s+${fname}\\s*\\(`).test(code);
    if (isUsed && !isDefined) missing.push(fcode);
  }
  return missing.length > 0 ? missing.join("\n") + "\n" + code : code;
}

/**
 * 验证 renderCode 质量：检测常见的风格违规并尝试自动修复。
 * 返回 { valid: boolean, code: string, issues: string[] }
 */
function validateAndFixRenderCode(code) {
  if (!code || typeof code !== "string") return { valid: false, code: "", issues: ["empty code"] };

  const issues = [];
  let fixed = code;

  // 1. 检测并修复 serif/cursive 字体
  const serifPattern = /fontFamily\s*:\s*["']([^"']*(?:serif|cursive|fantasy|Georgia|Times|Palatino)[^"']*)["']/gi;
  if (serifPattern.test(fixed)) {
    issues.push("forbidden font family (serif/cursive)");
    fixed = fixed.replace(serifPattern, 'fontFamily:"inherit"');
  }

  // 2. 检测并修复过大的字号（>20px，数字指标除外）
  const fontSizePattern = /fontSize\s*:\s*(\d+)/g;
  let m;
  while ((m = fontSizePattern.exec(fixed)) !== null) {
    const size = parseInt(m[1], 10);
    if (size > 20) {
      issues.push(`oversized fontSize: ${size}px`);
    }
  }
  fixed = fixed.replace(/fontSize\s*:\s*(\d+)/g, (match, sz) => {
    const n = parseInt(sz, 10);
    if (n > 20) return `fontSize:16`;
    return match;
  });

  // 3. 检测并移除 textShadow
  if (/textShadow\s*:/.test(fixed)) {
    issues.push("forbidden textShadow");
    fixed = fixed.replace(/textShadow\s*:\s*["'][^"']*["']/g, 'textShadow:"none"');
  }

  // 4. 检测并移除渐变背景
  if (/linear[_-]?gradient|radial[_-]?gradient/i.test(fixed)) {
    issues.push("forbidden gradient background");
    fixed = fixed.replace(/["']linear-gradient\([^"']*\)["']/gi, 't.bg');
    fixed = fixed.replace(/["']radial-gradient\([^"']*\)["']/gi, 't.bg');
    fixed = fixed.replace(/linearGradient/gi, '""');
    fixed = fixed.replace(/radialGradient/gi, '""');
  }

  // 5. 检测硬编码的深色主色（非灰度、非白色、非透明度辅助色）
  const hardcodedColorPattern = /#(?:[0-9a-f]{3}){1,2}\b/gi;
  const allowedColors = new Set([
    "#fff", "#ffffff", "#000", "#000000",
    "#8a9abc", "#b0b8cc", "#9aabcc", "#b0bccc", "#c0cbdf",
    "#f5f7fa", "#e8edf5", "#f4f7ff",
  ]);
  let colorMatch;
  const hardcodedColors = [];
  while ((colorMatch = hardcodedColorPattern.exec(fixed)) !== null) {
    const c = colorMatch[0].toLowerCase();
    if (!allowedColors.has(c) && !/^#[ef][0-9a-f]{5}$/i.test(c) && !/^#[0-9a-f]{2}$/i.test(c)) {
      // Check context: is it inside a t.xxx reference? If not, it's hardcoded.
      const beforeIdx = Math.max(0, colorMatch.index - 30);
      const before = fixed.slice(beforeIdx, colorMatch.index);
      if (!/picsum|seed|img|src|url|http/i.test(before)) {
        hardcodedColors.push(c);
      }
    }
  }
  if (hardcodedColors.length > 3) {
    issues.push(`excessive hardcoded colors (${hardcodedColors.length}): ${hardcodedColors.slice(0, 5).join(",")}`);
  }

  // 6. 检测厚重阴影
  const heavyShadowPattern = /boxShadow\s*:\s*["']([^"']*)["']/g;
  let shadowMatch;
  while ((shadowMatch = heavyShadowPattern.exec(fixed)) !== null) {
    const val = shadowMatch[1];
    const opacityMatch = val.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
    if (opacityMatch && parseFloat(opacityMatch[1]) > 0.15) {
      issues.push("heavy box-shadow opacity");
      fixed = fixed.replace(shadowMatch[0], 'boxShadow:"0 1px 8px rgba(0,0,0,0.04)"');
    }
  }

  // 7. 检测并替换语义 HTML 标签
  const semanticTags = /createElement\(\s*["'](h[1-6]|p|blockquote|pre|hr|ol|ul|li|dl|dt|dd|figure|figcaption|main|article|section|aside|header|footer|nav)["']/g;
  if (semanticTags.test(fixed)) {
    issues.push("semantic HTML tags with browser defaults (h1/p/etc)");
    fixed = fixed.replace(
      /createElement\(\s*["'](h[1-6]|p|blockquote|pre|figure|figcaption|main|article|section|aside|header|footer|nav)["']/g,
      'createElement("div"'
    );
    fixed = fixed.replace(/createElement\(\s*["'](ol|ul|dl)["']/g, 'createElement("div"');
    fixed = fixed.replace(/createElement\(\s*["'](li|dt|dd)["']/g, 'createElement("div"');
  }

  // 8. 检测并移除 emoji 字符（会以 3D/拟物风渲染，破坏扁平一致性）
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  if (emojiRegex.test(fixed)) {
    issues.push("emoji characters in code (causes 3D/skeuomorphic icons)");
    fixed = fixed.replace(emojiRegex, "");
    // 清理 emoji 移除后残留的前导空格（如 "💧 喝水" → " 喝水" → "喝水"）
    fixed = fixed.replace(/["']\s{2,}/g, (m) => m[0] + " ");
  }

  // 9. 渐变修正加强：处理字符串拼接式的渐变（如 'linear-gradient(135deg, '+t.primary+', #52C418)'）
  const gradientConcatPattern = /['"]linear-gradient\([^'"]*['"]\s*\+[^,)]+\+\s*['"][^'"]*\)['"]/g;
  if (gradientConcatPattern.test(fixed)) {
    issues.push("gradient via string concatenation");
    fixed = fixed.replace(gradientConcatPattern, "t.primary");
  }

  // 10. 语法预检：尝试解析代码确保无语法错误
  try {
    new Function("React", "props", fixed + "\nif(typeof render!=='function')throw new Error('no render');");
  } catch (syntaxErr) {
    issues.push(`syntax error: ${syntaxErr.message}`);
    return { valid: false, code: fixed, issues };
  }

  // 11. 确保包含 render 函数
  if (!/function\s+render\s*\(/.test(fixed)) {
    issues.push("missing render function");
    return { valid: false, code: fixed, issues };
  }

  const hasCriticalIssue = issues.some(i =>
    i.includes("missing render") || i.includes("excessive hardcoded") || i.includes("syntax error")
  );
  return { valid: !hasCriticalIssue, code: fixed, issues };
}

/**
 * 后处理 uiContent：移除 emoji、确保 navItems 正好 5 个、清理 category 泄露。
 */
function sanitizeUiContent(uc, category) {
  if (!uc || typeof uc !== "object") return uc;
  // eslint-disable-next-line no-misleading-character-class
  const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  const stripEmoji = (s) => typeof s === "string" ? s.replace(emojiRe, "").replace(/^\s+/, "").trim() : s;
  const stripCategory = (s) => typeof s === "string" && category ? s.replace(new RegExp(category, "g"), "").trim() : s;

  // 清理所有文本字段
  for (const key of Object.keys(uc)) {
    const val = uc[key];
    if (typeof val === "string") {
      uc[key] = stripCategory(stripEmoji(val));
    } else if (Array.isArray(val)) {
      uc[key] = val.map((item) => {
        if (typeof item === "string") return stripCategory(stripEmoji(item));
        if (item && typeof item === "object" && item.label) {
          item.label = stripCategory(stripEmoji(item.label));
        }
        return item;
      }).filter((item) => typeof item !== "string" || item.length > 0);
    }
  }

  // navItems 必须正好 5 个
  if (!Array.isArray(uc.navItems) || uc.navItems.length !== 5) {
    uc.navItems = ["首页", "发现", "发布", "消息", "我的"];
  }
  // 确保 navItems 中没有 category
  if (category) {
    uc.navItems = uc.navItems.map((n) =>
      typeof n === "string" && n.includes(category) ? "首页" : n
    );
  }

  return uc;
}

async function generateRenderCodeFallback(context, uiContent, isIosSpec, isHarmonySpec) {
  const uiSnapshot = JSON.stringify(uiContent || {}, null, 2);
  const txt = await callText(
    HIFI_RENDER_SYSTEM_PROMPT,
    `请基于页面上下文，生成移动端页面主体的渲染函数代码。\n` +
    `约束：\n` +
    `1) 只输出 function render(props){...} 及辅助区块函数，不要 markdown，不要额外文本\n` +
    `2) 必须使用 JavaScript + React.createElement，禁止 JSX\n` +
    `3) 仅渲染中间滚动主体，不要渲染固定头部/底部导航（TopBar/BottomNav由框架自动添加）\n` +
    `4) 优先使用 props.uiContent 的真实文案\n` +
    `5) 代码可直接在浏览器执行，避免依赖外部变量\n` +
    `6) 所有颜色必须从 props.theme(t) 取值：t.primary/t.surface/t.bg/t.text/t.border\n` +
    `7) 字号严格控制：标题≤17px，正文13-14px，辅助11-12px\n` +
    `8) 卡片白底(t.surface)、轻盈阴影(0 1px 8px rgba(0,0,0,0.04))、适中圆角\n` +
    `9) 禁止serif/cursive字体、textShadow、渐变背景、letterSpacing>1\n` +
    `${isIosSpec ? "10) 视觉风格贴合 iOS，间距克制、层级清晰\n" : ""}` +
    `${isHarmonySpec ? "10) 视觉风格遵循 HarmonyOS Design：品牌色#0A59F7、页面底色#F1F3F5、卡片圆角16px、按钮胶囊形圆角20px、HarmonyHeiTi 字体、轻投影(0 1px 6px rgba(0,0,0,0.05))、纯净克制留白。主色调使用鸿蒙品牌色，不使用自选主题色\n" : ""}\n` +
    `render(props) 结构：\n` +
    `function render(props){\n` +
    `  var R=React,t=Object.assign({primary:"#3B82F6",surface:"#fff",bg:"#f5f7fa",text:"#1a2540",border:"#e8edf5"},props.theme||{}),u=props.uiContent||{};\n` +
    `  return R.createElement("div",{style:{background:t.bg}}, ...);\n` +
    `}\n\n` +
    `页面上下文：\n${context}\n\n` +
    `uiContent 快照：\n${uiSnapshot}`
  );
  return extractRenderFunction(txt);
}

async function callVisionJSON(system, user, imageDataUrls = []) {
  const safeImages = (imageDataUrls || []).filter((u) => typeof u === "string" && /^data:image\//.test(u)).slice(0, 4);
  if (safeImages.length === 0) return callJSON(system, user);
  try {
    const content = [
      { type: "text", text: user },
      ...safeImages.map((url) => ({ type: "image_url", image_url: { url } })),
    ];
    const res = await visionLlm.chat.completions.create({
      model: VISION_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content }],
      temperature: 0.6,
    });
    return extractJSON(res.choices[0].message.content);
  } catch (e) {
    console.error("[LLM-VISION-JSON]", e.message);
    return callJSON(system, `${user}\n\n（图像解析失败，按文本上下文完成）`);
  }
}

// ─── PRD 文档结构（6 个版块 — 渐进式 IA 架构）─────────────────────────────
const SECTIONS = [
  { sectionId: "basic_positioning",     label: "产品基础定位",   docTitle: "1. 产品基础定位" },
  { sectionId: "role_permission",       label: "角色与权限",     docTitle: "2. 角色与权限" },
  { sectionId: "ia_structure",          label: "信息架构",       docTitle: "3. 信息架构" },
  { sectionId: "core_flows",           label: "核心流转路径",   docTitle: "4. 核心流转路径" },
  { sectionId: "basic_capabilities",    label: "基础能力",       docTitle: "5. 基础能力" },
  { sectionId: "page_feature_list",     label: "页面与功能清单", docTitle: "6. 页面与功能清单" },
];

// ─── 5 阶段渐进式 IA 架构状态机 ────────────────────────────────────────────
// Phase 1: 角色边界  Phase 2: 一级模块  Phase 3: 模块展开（逐模块迭代）
// Phase 4: 流转路径  Phase 5: 架构结算

const PHASE_LABELS = {
  1: "核心角色",
  2: "一级模块",
  3: "模块展开",
  4: "流转路径",
  5: "架构结算",
};

async function runPhase1(session) {
  const prompt = buildPhase1Prompt(session.templateData, session.seedIntent);
  const result = await callJSON(IA_SYSTEM_PROMPT, prompt);
  if (!result?.roles?.length) return null;
  return result.roles.map((r, i) => ({
    id: r.id || `role_${i + 1}`,
    label: r.label,
    description: r.description || "",
    recommended: r.recommended !== false,
  }));
}

async function runPhase2(session) {
  const prompt = buildPhase2Prompt(session.templateData, session.iaData.roles, session.seedIntent);
  const result = await callJSON(IA_SYSTEM_PROMPT, prompt);
  if (!result?.modules?.length) return null;
  return result.modules.map((m, i) => ({
    id: m.id || `mod_${i + 1}`,
    label: m.label,
    description: m.description || "",
    roles: m.roles || [],
    recommended: m.recommended !== false,
  }));
}

async function runPhase3ForModule(session, moduleObj) {
  const prompt = buildPhase3Prompt(
    session.templateData,
    session.iaData.roles,
    session.iaData.modules,
    moduleObj,
    session.seedIntent
  );
  const result = await callJSON(IA_SYSTEM_PROMPT, prompt);
  if (!result?.pages?.length) return null;
  return result.pages.map((p, i) => ({
    id: p.id || `page_${i + 1}`,
    label: p.label,
    description: p.description || "",
    features: p.features || [],
    recommended: p.recommended !== false,
  }));
}

async function runPhase4(session) {
  const prompt = buildPhase4Prompt(
    session.templateData,
    session.iaData.roles,
    session.iaData.modules,
    session.iaData.modulePages,
    session.seedIntent
  );
  const result = await callJSON(IA_SYSTEM_PROMPT, prompt);
  if (!result?.flows?.length) return null;
  return result.flows.map((f, i) => {
    const story = f.story || `流转路径 ${i + 1}`;
    const path = Array.isArray(f.path) ? f.path : [];
    return {
      id: f.id || `flow_${i + 1}`,
      label: story,
      description: path.length ? path.join(" → ") : "",
      story,
      path,
      data_carried: Array.isArray(f.data_carried) ? f.data_carried : [],
      recommended: f.recommended !== false,
    };
  });
}

// ─── Agent：任意填空变化后，根据当前已填内容为后续空生成最新参考选项 ────────
async function templateSuggestAgent(fields) {
  const { target = "", scene = "", task = "", problem = "",
          userType = "", needs = "", primaryTask = "", secondary = "" } = fields;

  const context = [
    target    && `面向用户：${target}`,
    scene     && `使用场景：${scene}`,
    task      && `核心任务：${task}`,
    problem   && `解决问题：${problem}`,
    userType  && `用户类型：${userType}`,
    needs     && `主要需求：${needs}`,
    primaryTask && `首要任务：${primaryTask}`,
    secondary && `次要需求：${secondary}`,
  ].filter(Boolean).join("\n");

  const result = await callJSON(
    "你是产品经理，只输出JSON对象，不要解释。",
    `用户正在填写产品描述模板，当前已填：\n${context || "（尚未填写任何内容）"}\n\n请根据已有上下文，为以下每个填空提供3个参考选项（每项8字以内，贴合产品场景）：\n- scene（在什么场景下使用）\n- task（完成什么核心任务）\n- problem（解决什么问题）\n- userType（用户通常是什么类型）\n- needs（最常见需求是什么）\n- primaryTask（进入产品后首要任务）\n- secondary（次要需求）\n\n只输出JSON对象：{"scene":[],"task":[],"problem":[],"userType":[],"needs":[],"primaryTask":[],"secondary":[]}`
  );
  return result || { scene: [], task: [], problem: [], userType: [], needs: [], primaryTask: [], secondary: [] };
}

// ─── Phase 5 结算：所有阶段完成后，统一生成 PRD 各版块内容 ──────────────────
async function composeAllSections(session) {
  const ia = session.iaData;
  const prompt = buildPhase5PrdPrompt(
    session.templateData,
    ia.roles,
    ia.modules,
    ia.modulePages,
    ia.flows,
    session.seedIntent
  );
  const result = await callJSON(IA_SYSTEM_PROMPT, prompt);

  if (result) {
    const ids = ["role_permission", "ia_structure", "core_flows", "basic_capabilities"];
    for (const id of ids) {
      if (result[id]) session.docBlockContents[id] = result[id];
    }
  }
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function createSession(sessionId, requirementText, templateData) {
  return {
    sessionId,
    requirementText,
    templateData,
    // 渐进式 IA 架构状态
    currentPhase: 1,       // 1-5
    phase3ModuleIdx: 0,    // Phase 3 当前展开到第几个模块
    iaData: {
      roles: [],           // Phase 1 确认的角色
      modules: [],         // Phase 2 确认的模块
      modulePages: {},     // Phase 3 确认的页面: moduleId → pages[]
      flows: [],           // Phase 4 确认的流转路径
    },
    pendingOptions: null,  // 当前阶段 LLM 推断的选项（待用户确认）
    docBlockContents: {},
    messages: [],
  };
}

/**
 * 将用户的选项回答解析为确认的对象列表。
 * pendingOptions: 当前阶段推断出的完整选项列表
 * answer: { selectedOptionIds, customText }
 */
function resolveSelectedItems(pendingOptions, answer) {
  const { selectedOptionIds = [], customText = "" } = answer;
  const selected = pendingOptions
    .filter((opt) => selectedOptionIds.includes(opt.id))
    .filter((opt) => opt.id !== "custom");
  if (customText.trim()) {
    const customs = customText.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean);
    for (const c of customs) {
      selected.push({ id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, label: c, description: c, recommended: false });
    }
  }
  return selected;
}

function answerToText(pendingOptions, answer) {
  const items = resolveSelectedItems(pendingOptions, answer);
  return items.map((i) => i.label).join("、") || answer.customText?.trim() || "";
}

/**
 * 根据当前 phase 构建 pendingQuestion（兼容前端 Question 类型）
 */
function buildPhaseQuestion(session) {
  const phase = session.currentPhase;
  const opts = session.pendingOptions || [];
  if (phase >= 5 || !opts.length) return null;

  const phaseConfig = {
    1: {
      id: "phase_1_roles",
      topic: PHASE_LABELS[1],
      questionText: "根据你的产品描述，我推断系统可能涉及以下用户角色。请勾选需要保留的角色，也可以补充：",
      multiSelect: true,
    },
    2: {
      id: "phase_2_modules",
      topic: PHASE_LABELS[2],
      questionText: "为了支持已确认的角色，我建议系统划分为以下独立的一级功能模块（平级入口）。请确认增删：",
      multiSelect: true,
    },
    3: {
      id: `phase_3_module_${session.phase3ModuleIdx}`,
      topic: `${PHASE_LABELS[3]}：${session.iaData.modules[session.phase3ModuleIdx]?.label || ""}`,
      questionText: `正在展开模块【${session.iaData.modules[session.phase3ModuleIdx]?.label || ""}】，以下是推断的二级页面，请确认：`,
      multiSelect: true,
    },
    4: {
      id: "phase_4_flows",
      topic: PHASE_LABELS[4],
      questionText: "基于已确认的页面结构，我为核心场景推断了以下黄金流转路径。请确认是否符合预期：",
      multiSelect: true,
    },
  };

  const cfg = phaseConfig[phase];
  if (!cfg) return null;

  const totalPhases = 5;
  const totalModules = session.iaData.modules.length || 1;
  let progressCurrent, progressTotal;

  if (phase <= 2) {
    progressCurrent = phase;
    progressTotal = totalPhases;
  } else if (phase === 3) {
    progressCurrent = 3;
    progressTotal = totalPhases;
  } else {
    progressCurrent = phase;
    progressTotal = totalPhases;
  }

  return {
    ...cfg,
    options: opts.map((o) => ({ id: o.id, label: o.description ? `${o.label}（${o.description}）` : o.label })),
    sectionLabel: `阶段 ${phase}/${totalPhases}：${PHASE_LABELS[phase]}` + (phase === 3 ? `（${session.phase3ModuleIdx + 1}/${totalModules}）` : ""),
    sectionProgress: { current: progressCurrent, total: progressTotal },
  };
}

function getPartialContent(session, sectionId) {
  const ia = session.iaData || {};
  switch (sectionId) {
    case "basic_positioning":
      return "（由模板自动填充）";
    case "role_permission":
      return ia.roles?.length
        ? ia.roles.map((r) => `- ${r.label}：${r.description}`).join("\n")
        : "（等待角色确认后生成）";
    case "ia_structure": {
      if (!ia.modules?.length) return "（等待模块确认后生成）";
      const lines = [];
      for (const mod of ia.modules) {
        lines.push(`【${mod.label}】${mod.description}`);
        const pages = ia.modulePages?.[mod.id] || [];
        for (const p of pages) lines.push(`  • ${p.label}：${p.description}`);
      }
      return lines.join("\n") || "（等待页面确认后生成）";
    }
    case "core_flows":
      return ia.flows?.length
        ? ia.flows.map((f, i) => {
            const story = f.story || f.label || `流转路径 ${i + 1}`;
            const path = Array.isArray(f.path) ? f.path : [];
            return path.length
              ? `${i + 1}. ${story}\n   路径：${path.join(" → ")}`
              : `${i + 1}. ${story}`;
          }).join("\n")
        : "（等待流转路径确认后生成）";
    case "basic_capabilities":
      return "（将在架构结算时自动生成）";
    default:
      return "待补充";
  }
}

function composeDocBlocks(session) {
  return SECTIONS.map((s, idx) => ({
    blockId: s.sectionId,
    section: s.label,
    title: s.docTitle,
    content: session.docBlockContents[s.sectionId] || getPartialContent(session, s.sectionId),
    order: idx + 1,
  }));
}

function completionScore(session) {
  const phase = session.currentPhase || 1;
  const hasTemplate = session.docBlockContents["basic_positioning"] ? 10 : 0;
  // Phase 1→10%, Phase 2→30%, Phase 3→50%, Phase 4→70%, Phase 5(done)→100%
  const phaseBase = { 1: 10, 2: 30, 3: 40, 4: 70, 5: 100 };
  let phaseScore = phaseBase[phase] || 0;
  // Phase 3 细分：按模块展开进度
  if (phase === 3 && session.iaData.modules.length > 0) {
    const progress = session.phase3ModuleIdx / session.iaData.modules.length;
    phaseScore = 40 + Math.round(progress * 30);
  }
  const docBonus = Object.keys(session.docBlockContents).length >= 5 ? 10 : 0;
  return Math.min(100, hasTemplate + phaseScore + docBonus);
}

function pushMsg(newMessages, session, role, content) {
  session.messages.push({ role, content });
  newMessages.push({ role, content });
}

function formatPrdMarkdown(docBlocks = []) {
  const ordered = [...docBlocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  const parts = ordered.map((b) => {
    const heading = b.title?.trim() || b.section?.trim() || b.blockId;
    const content = (b.content || "").trim();
    return `## ${heading}\n\n${content || "（空）"}`;
  });
  return `# PRD 文档\n\n导出时间：${new Date().toLocaleString("zh-CN")}\n\n${parts.join("\n\n")}\n`;
}

function buildTimestampFilename(prefix = "prd", ext = "md") {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}_${ts}.${ext}`;
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, "_").slice(0, 80);
}

/**
 * 每次生成高保真后，自动将 renderCode / uiContent / renderInstructions 保存到本地。
 * 目录结构：saved-hifi/<timestamp>/<页面名>.js  +  <页面名>.json
 */
async function saveHiFiToLocal(pages, renderCodes, uiContents, renderInstructions, designSystem) {
  const hasAnyCode = Object.values(renderCodes).some((c) => c);
  if (!hasAnyCode) return;

  const saveRoot = path.resolve(__dirname, "../../saved-hifi");
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const batchDir = path.join(saveRoot, ts);
  await fs.mkdir(batchDir, { recursive: true });

  for (const page of pages) {
    const code = renderCodes[page.name];
    if (!code) continue;
    const safeName = sanitizeFileName(page.name);

    // 保存 renderCode（可独立在 iframe 沙箱中执行的 JS）
    await fs.writeFile(
      path.join(batchDir, `${safeName}.js`),
      `// 高保真渲染代码 — ${page.name}\n` +
      `// 生成时间: ${d.toLocaleString("zh-CN")}\n` +
      `// 设计系统: theme=${designSystem?.theme}, lib=${designSystem?.componentLib}, radius=${designSystem?.radius}\n\n` +
      code,
      "utf8"
    );

    // 保存 uiContent + renderInstructions 元数据
    const meta = {
      pageName: page.name,
      category: page.category,
      features: page.features,
      generatedAt: d.toISOString(),
      designSystem: designSystem || null,
      renderInstructions: renderInstructions[page.name] || "",
      uiContent: uiContents[page.name] || {},
    };
    await fs.writeFile(
      path.join(batchDir, `${safeName}.json`),
      JSON.stringify(meta, null, 2),
      "utf8"
    );
  }

  console.log(`[HiFi-Save] Saved ${pages.filter((p) => renderCodes[p.name]).length} page(s) to ${batchDir}`);
}

function buildPayload(session, newMessages = []) {
  const pending = buildPhaseQuestion(session);
  const isDone = session.currentPhase >= 5;

  return {
    sessionId: session.sessionId,
    pendingQuestion: pending,
    completionScore: completionScore(session),
    docBlocks: composeDocBlocks(session),
    done: isDone,
    newMessages,
    // 新增：当 Phase 5 完成时，附带页面清单和 IA 拓扑
    ...(isDone && session.generatedPageList ? {
      pageList: session.generatedPageList,
      iaTopology: session.iaTopology,
    } : {}),
  };
}

function normalizeTargetModules(mods) {
  const all = new Set(["feature_list", "layout", "render"]);
  const arr = Array.isArray(mods) ? mods.filter((m) => all.has(m)) : [];
  return arr.length ? arr : ["feature_list"];
}

function parseMentionTargets(instruction = "", pageNames = [], wireframes = {}) {
  const text = String(instruction || "");
  const pages = (pageNames || []).filter((n) => text.includes(`@${n}`));
  const modules = [];
  if (/@功能列表|@功能清单/.test(text)) modules.push("feature_list");
  if (/@布局|@线框/.test(text)) modules.push("layout");
  if (/@渲染|@高保真/.test(text)) modules.push("render");

  // 解析组件 @mention：从已 @提及页面的线框区块中匹配
  const mentionedComponents = [];
  for (const pageName of pages) {
    const sections = (wireframes || {})[pageName] || [];
    for (const sec of sections) {
      if (sec.label && text.includes(`@${sec.label}`)) {
        mentionedComponents.push({
          pageName,
          label: sec.label,
          type: sec.type,
          shared: !!sec.shared,
          sharedKey: sec.sharedKey || null,
          heightRatio: sec.heightRatio || 0,
        });
      }
    }
  }

  // 若 @了组件但未显式 @布局，自动补充 layout 范围
  if (mentionedComponents.length > 0 && !modules.includes("layout")) {
    modules.push("layout");
  }

  return { pages, modules, mentionedComponents };
}

function collectPageNamesFromList(rawList) {
  const names = [];
  for (const cat of rawList?.categories || []) {
    for (const p of cat.pages || []) names.push(p.name);
  }
  return names.filter(Boolean);
}

function mergeTargetedListChanges(originalList, changedList, targetPageNames = []) {
  if (!Array.isArray(targetPageNames) || targetPageNames.length === 0) return changedList;
  const targetSet = new Set(targetPageNames);
  const changedMap = new Map();
  for (const cat of changedList?.categories || []) {
    for (const p of cat.pages || []) {
      if (targetSet.has(p.name)) changedMap.set(p.name, p);
    }
  }
  const merged = {
    categories: (originalList?.categories || []).map((cat) => ({
      ...cat,
      pages: (cat.pages || []).map((p) => {
        if (!targetSet.has(p.name)) return p;
        return changedMap.get(p.name) || p;
      }),
    })),
  };
  return merged;
}

function getPageSnapshot(session, pageName) {
  const list = session.confirmedPageList?.categories || [];
  for (const cat of list) {
    for (const page of cat.pages || []) {
      if (page.name === pageName && page.selected !== false) {
        return {
          category: cat.name,
          name: page.name,
          features: (page.features || [])
            .filter((f) => f.selected !== false)
            .map((f) => (typeof f === "string" ? f : f.text)),
          layout: session.pageLayouts?.[page.name] || "",
          render: session.pageRenders?.[page.name] || "",
          wireframe: session.pageWireframes?.[page.name] || null,
        };
      }
    }
  }
  return null;
}

async function updatePageHintsByScope({ session, targetPageNames, targetModules, instruction, referenceImages, mentionedComponents = [] }) {
  if (!session || !Array.isArray(targetPageNames) || targetPageNames.length === 0) return { updated: false, pageHints: {} };
  const modules = normalizeTargetModules(targetModules);
  const needLayout = modules.includes("layout");
  const needRender = modules.includes("render");
  if (!needLayout && !needRender) return { updated: false, pageHints: {} };

  session.pageLayouts = session.pageLayouts || {};
  session.pageRenders = session.pageRenders || {};

  const pageHints = {};
  let changed = false;

  for (const pageName of targetPageNames) {
    const snap = getPageSnapshot(session, pageName);
    if (!snap) continue;
    // 获取当前组件清单，便于 AI 精确引用和修改
    const wireframes = session.pageWireframes || {};
    const compList = Array.isArray(wireframes[snap.name]) && wireframes[snap.name].length > 0
      ? wireframes[snap.name].map(s =>
          `${getCompLabelZh(s)}(${s.shared ? "公共" : "私有"},${Math.round((s.heightRatio || 0) * 100)}%)`
        ).join(" → ")
      : "暂无";

    // 用户 @提及的具体组件（只取当前页面的）
    const pageComponents = (mentionedComponents || []).filter(c => c.pageName === snap.name);
    const compMentionContext = pageComponents.length > 0
      ? `\n用户@提及的具体组件：${pageComponents.map(c =>
          `【${c.label}】（${c.shared ? "公共" : "私有"}组件，高度${Math.round(c.heightRatio * 100)}%）`
        ).join("、")}`
      : "";

    const user = [
      `页面：${snap.name}（${snap.category}）`,
      `功能点：${snap.features.join("、") || "无"}`,
      needLayout ? `当前布局说明：${snap.layout || "无"}` : "",
      needLayout ? `当前布局组件列表（从上到下顺序，括号内为公共/私有和高度占比）：${compList}` : "",
      needRender ? `当前渲染说明：${snap.render || "无"}` : "",
      `用户修改要求：${instruction}${compMentionContext}`,
      `需要更新模块：${modules.join("、")}`,
    ].filter(Boolean).join("\n");

    const result = await callVisionJSON(
      "你是产品与UI设计专家。根据页面上下文和用户要求，输出JSON，不要解释。",
      `${user}\n\n` +
      `请输出修改后的页面文档描述（用于PRD存档）：\n` +
      `{"layout":"修改后的完整布局现状（100-150字）：先列出修改后的组件清单（按顺序：**组件名**/公共或私有/高度占比），再描述整体结构和视觉意图。每次提到组件名称时使用**组件名**加粗格式。必须将用户要求中的新增/删除/修改的组件准确反映到描述中，不要泛化，不要丢失细节","render":"修改后的完整渲染规范现状（100-150字）：描述修改后的视觉效果，必须将用户要求中的具体细节（如颜色值、组件样式、字体大小、间距等）完整保留，不要描述改了什么，而是描述现在应该呈现什么"}\n` +
      `注意：① 若某模块未要求更新，返回空字符串。② 用户指定的具体参数（数字/颜色/组件名/交互方式等）必须原样写入描述中，不得替换为模糊表达。③ 若用户要求增删组件，layout 字段的组件清单必须体现增删结果。④ 若用户 @提及了具体组件，则在 layout 描述中特别指出该组件的修改要点。`,
      referenceImages
    );

    const layout = typeof result?.layout === "string" ? result.layout.trim() : "";
    const render = typeof result?.render === "string" ? result.render.trim() : "";
    if (needLayout && layout) { session.pageLayouts[snap.name] = layout; changed = true; }
    if (needRender && render) { session.pageRenders[snap.name] = render; changed = true; }
    // userRequest = 用户原始指令，供前端直接驱动生成，避免经 AI 翻译后丢失细节
    pageHints[snap.name] = {
      layout: session.pageLayouts[snap.name] || "",
      render: session.pageRenders[snap.name] || "",
      userRequest: instruction,
    };
  }

  if (changed) {
    session.docBlockContents["page_feature_list"] = formatPageList(session);
  }
  return { updated: changed, pageHints };
}

async function updateFeatureListByScope({ currentList, instruction, targetPageNames, referenceImages }) {
  const focusHint = Array.isArray(targetPageNames) && targetPageNames.length
    ? `\n【强约束】仅允许修改以下页面：${targetPageNames.join("、")}。未被@的页面不得增删改名称与功能点。`
    : "\n未指定页面时可全局调整。";
  const result = await callVisionJSON(
    "你是产品经理，根据指令修改页面功能清单，只输出更新后的完整JSON，格式与输入相同，不要解释。",
    `当前页面与功能清单：\n${JSON.stringify(currentList, null, 2)}\n\n用户指令：${instruction}${focusHint}\n\n严格要求：\n1) 若用户使用了@页面，只能修改这些页面；\n2) 其他页面仅允许极少量关联文案微调，禁止结构性改动；\n3) 输出完整更新后清单。\n\n输出格式：{"categories":[{"name":"...","pages":[{"name":"...","features":["..."]}]}]}`,
    referenceImages
  );
  if (!result?.categories) return null;
  return mergeTargetedListChanges(currentList, result, targetPageNames);
}

function parsePrdMarkdownToDebugData(markdown) {
  const sections = [];
  const chunks = markdown.split(/^##\s+/m).slice(1);
  for (const chunk of chunks) {
    const idx = chunk.indexOf("\n");
    if (idx < 0) continue;
    const title = chunk.slice(0, idx).trim();
    const content = chunk.slice(idx + 1).trim();
    if (title) {
      sections.push({ title, content });
    }
  }

  const idMap = [
    "basic_positioning",
    "role_permission",
    "ia_structure",
    "core_flows",
    "basic_capabilities",
    "page_feature_list",
  ];
  const docBlocks = sections.slice(0, 6).map((s, i) => ({
    blockId: idMap[i] || `sec_${i + 1}`,
    section: s.title.replace(/^\d+\.\s*/, ""),
    title: s.title,
    content: s.content,
    order: i,
  }));

  const pageSec = sections.find((s) => /页面与功能清单/.test(s.title));
  const lines = (pageSec?.content || "").split(/\r?\n/);
  const categories = [];
  let curCat = null;
  let curPage = null;
  let pageIdx = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    const cat = line.match(/^【(.+)】$/);
    if (cat) {
      curCat = { name: cat[1], pages: [] };
      categories.push(curCat);
      curPage = null;
      continue;
    }
    const pg = line.match(/^\s*•\s+(.+)$/);
    if (pg && curCat) {
      curPage = { id: `dbg_${pageIdx++}`, name: pg[1].trim(), selected: true, expanded: false, stage: 1, features: [] };
      curCat.pages.push(curPage);
      continue;
    }
    const feat = line.match(/^\s*-\s+(.+)$/);
    if (feat && curPage) {
      curPage.features.push({ id: `f_${curPage.id}_${curPage.features.length}`, text: feat[1].trim(), selected: true });
    }
  }
  return { docBlocks, pageList: categories };
}

// ─── Agent：根据用户自然语言修改意见更新 PRD ──────────────────────────────────
async function refineAgent(session, message) {
  const prdContent = SECTIONS.slice(0, 5)
    .map((s) => {
      const c = session.docBlockContents[s.sectionId];
      return c ? `【${s.label}】\n${c}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const result = await callJSON(
    "你是产品经理，帮助用户修改PRD文档，只输出JSON，不要解释。",
    `当前PRD内容：\n${prdContent}\n\n用户修改意见：${message}\n\n请根据用户意见修改对应版块（只输出有变化的版块），并给用户一句简短的确认回复。\n只输出JSON：{"updates":{"sectionId":"更新后的完整内容"},"reply":"简短回复（20字以内）"}\n可用sectionId：basic_positioning, role_permission, ia_structure, core_flows, basic_capabilities`
  );

  return result || { updates: {}, reply: "已收到，请在右侧 PRD 文档中查看。" };
}

// ─── 路由 ─────────────────────────────────────────────────────────────────────

// 任意填空变化 → 实时返回后续空的参考选项
app.post("/api/template/suggest", async (req, res) => {
  const fields = req.body || {};
  const hasAny = Object.values(fields).some((v) => typeof v === "string" && v.trim());
  if (!hasAny) return res.json({ suggestions: { scene: [], task: [], problem: [], userType: [], needs: [], primaryTask: [], secondary: [] } });
  const suggestions = await templateSuggestAgent(fields);
  return res.json({ suggestions });
});

// 提交种子意图 → LLM 提取关键信息 → 创建会话 → Phase 1: 推断角色
app.post("/api/chat/start", async (req, res) => {
  // 支持两种输入：新的 seedIntent 文本 或 旧的 templateData 对象
  const seedIntent = req.body?.seedIntent;
  const rawTd = req.body?.templateData;

  let td;

  if (seedIntent && typeof seedIntent === "string" && seedIntent.trim()) {
    // 从种子意图中 LLM 提取结构化信息
    const extracted = await callJSON(
      "你是产品分析专家，从用户的产品描述中提取关键信息，只输出JSON。",
      `用户描述了一个产品想法：\n"${seedIntent.trim()}"\n\n` +
      `请从中提取以下信息（如果用户未明确提及某项，请基于上下文合理推断）：\n` +
      `只输出JSON：\n` +
      `{"target":"目标用户群体","scene":"主要使用场景","task":"核心任务","problem":"要解决的核心问题","userType":"典型用户画像","needs":"最常见需求","primaryTask":"进入产品后首要任务","secondary":"次要需求"}`
    );
    td = extracted || {
      target: "目标用户", scene: "日常使用", task: "核心任务",
      problem: "待明确", userType: "普通用户", needs: "待明确",
      primaryTask: "待明确", secondary: "待明确",
    };
    // 确保所有字段都有值
    const defaults = { target: "目标用户", scene: "日常使用", task: "核心任务", problem: "待明确", userType: "普通用户", needs: "待明确", primaryTask: "待明确", secondary: "待明确" };
    for (const [k, v] of Object.entries(defaults)) {
      if (!td[k] || !String(td[k]).trim()) td[k] = v;
    }
  } else if (rawTd) {
    // 兼容旧的 templateData 输入
    td = rawTd;
    const required = ["target", "scene", "task", "problem", "userType", "needs", "primaryTask", "secondary"];
    for (const f of required) {
      if (!td[f]?.trim()) return res.status(400).json({ message: `templateData.${f} 不能为空` });
    }
  } else {
    return res.status(400).json({ message: "请提供 seedIntent 或 templateData" });
  }

  const requirementText = seedIntent?.trim() || [
    `这是一个面向${td.target}的产品，主要帮助他们在${td.scene}场景下完成${td.task}，解决${td.problem}问题。`,
    `用户通常是${td.userType}，他们最常见的需求包括${td.needs}。`,
    `用户进入产品后，最希望先完成${td.primaryTask}；除核心任务外，还可能需要${td.secondary}。`,
  ].join("\n");

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = createSession(sessionId, requirementText, td);
  // 保存原始种子意图供后续阶段使用
  session.seedIntent = seedIntent?.trim() || "";
  sessions.set(sessionId, session);

  session.docBlockContents["basic_positioning"] = seedIntent?.trim()
    ? `产品名称：（待定）\n种子意图：${seedIntent.trim()}\n目标用户：${td.target}\n核心任务：${td.task}\n解决问题：${td.problem}`
    : [
      `产品名称：（待定）`,
      `一句话介绍：面向${td.target}，帮助他们在${td.scene}场景下完成${td.task}，解决${td.problem}。`,
      `目标用户：${td.userType}`,
      `核心需求：${td.needs}`,
      `首要任务：${td.primaryTask}`,
    ].join("\n");

  const newMessages = [];
  pushMsg(newMessages, session, "assistant",
    `已收到产品描述！接下来我将通过 5 个阶段逐步构建系统的信息架构（IA），每一步都需要你的确认。`
  );

  // Phase 1: 推断角色
  pushMsg(newMessages, session, "assistant",
    `【阶段 1/5：核心角色】正在分析产品可能涉及的用户角色…`
  );
  const roles = await runPhase1(session);
  if (roles?.length) {
    session.pendingOptions = roles;
    session.currentPhase = 1;
  } else {
    pushMsg(newMessages, session, "assistant", "角色推断失败，请重试。");
  }

  sessions.set(sessionId, session);
  return res.json(buildPayload(session, newMessages));
});

// 用户回答渐进式 IA 架构问题（Phase 1-4）
app.post("/api/chat/answer", async (req, res) => {
  const sessionId = req.body?.sessionId;
  const answer =
    req.body?.answer ||
    (Array.isArray(req.body?.answers) ? req.body.answers[0] : null) ||
    {};

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ message: "会话不存在" });
  }

  const session = sessions.get(sessionId);
  const phase = session.currentPhase;
  const pending = session.pendingOptions || [];
  if (phase >= 5 || !pending.length) return res.json(buildPayload(session));

  const newMessages = [];
  const selectedItems = resolveSelectedItems(pending, answer);
  const selectedText = answerToText(pending, answer);

  // ── Phase 1: 角色确认 → 进入 Phase 2 ──────────────────────────────────────
  if (phase === 1) {
    session.iaData.roles = selectedItems;
    session.docBlockContents["role_permission"] =
      selectedItems.map((r) => `- **${r.label}**：${r.description || ""}`).join("\n");
    pushMsg(newMessages, session, "assistant",
      `已确认 ${selectedItems.length} 个角色：${selectedText}。\n【阶段 2/5：一级模块】正在推断系统模块…`
    );
    const modules = await runPhase2(session);
    if (modules?.length) {
      session.pendingOptions = modules;
      session.currentPhase = 2;
    } else {
      pushMsg(newMessages, session, "assistant", "模块推断失败，请重试。");
    }
  }

  // ── Phase 2: 模块确认 → 进入 Phase 3（逐模块展开）──────────────────────────
  else if (phase === 2) {
    session.iaData.modules = selectedItems;
    pushMsg(newMessages, session, "assistant",
      `已确认 ${selectedItems.length} 个一级模块：${selectedText}。\n【阶段 3/5：模块展开】接下来逐个展开每个模块的二级页面。`
    );
    session.phase3ModuleIdx = 0;
    session.currentPhase = 3;
    // 展开第一个模块
    const firstMod = session.iaData.modules[0];
    if (firstMod) {
      pushMsg(newMessages, session, "assistant",
        `正在展开模块【${firstMod.label}】（1/${session.iaData.modules.length}）…`
      );
      const pages = await runPhase3ForModule(session, firstMod);
      if (pages?.length) {
        session.pendingOptions = pages;
      } else {
        pushMsg(newMessages, session, "assistant", `模块【${firstMod.label}】页面推断失败，请重试。`);
      }
    }
  }

  // ── Phase 3: 页面确认（逐模块迭代）──────────────────────────────────────────
  else if (phase === 3) {
    const currentMod = session.iaData.modules[session.phase3ModuleIdx];
    session.iaData.modulePages[currentMod.id] = selectedItems;
    pushMsg(newMessages, session, "assistant",
      `模块【${currentMod.label}】已确认 ${selectedItems.length} 个页面：${selectedText}`
    );

    session.phase3ModuleIdx += 1;

    if (session.phase3ModuleIdx < session.iaData.modules.length) {
      // 展开下一个模块
      const nextMod = session.iaData.modules[session.phase3ModuleIdx];
      pushMsg(newMessages, session, "assistant",
        `正在展开模块【${nextMod.label}】（${session.phase3ModuleIdx + 1}/${session.iaData.modules.length}）…`
      );
      const pages = await runPhase3ForModule(session, nextMod);
      if (pages?.length) {
        session.pendingOptions = pages;
      } else {
        pushMsg(newMessages, session, "assistant", `模块【${nextMod.label}】页面推断失败，请重试。`);
      }
    } else {
      // 所有模块展开完毕 → 更新 IA 结构文档 → 进入 Phase 4
      const iaLines = [];
      for (const mod of session.iaData.modules) {
        iaLines.push(`【${mod.label}】${mod.description || ""}`);
        for (const p of session.iaData.modulePages[mod.id] || []) {
          iaLines.push(`  • ${p.label}：${p.description || ""}`);
        }
      }
      session.docBlockContents["ia_structure"] = iaLines.join("\n");

      pushMsg(newMessages, session, "assistant",
        `所有模块页面已确认！\n【阶段 4/5：核心流转路径】正在推断黄金用户路径…`
      );
      session.currentPhase = 4;
      const flows = await runPhase4(session);
      if (flows?.length) {
        session.pendingOptions = flows;
      } else {
        pushMsg(newMessages, session, "assistant", "流转路径推断失败，请重试。");
      }
    }
  }

  // ── Phase 4: 流转路径确认 → 进入 Phase 5（架构结算）───────────────────────
  else if (phase === 4) {
    session.iaData.flows = selectedItems;
    session.docBlockContents["core_flows"] =
      selectedItems.map((f, i) => {
        const story = f.story || f.label || `流转路径 ${i + 1}`;
        const path = Array.isArray(f.path) ? f.path : [];
        const carried = Array.isArray(f.data_carried) ? f.data_carried : [];
        const parts = [`${i + 1}. ${story}`];
        if (path.length) parts.push(`   路径：${path.join(" → ")}`);
        if (carried.length) parts.push(`   携带数据：${carried.join("、")}`);
        return parts.join("\n");
      }).join("\n\n");

    pushMsg(newMessages, session, "assistant",
      `已确认 ${selectedItems.length} 条流转路径。\n【阶段 5/5：架构结算】正在生成完整 PRD 文档…`
    );

    // Phase 5: 架构结算
    session.currentPhase = 5;
    session.pendingOptions = [];

    // 生成 PRD 各版块
    await composeAllSections(session);

    // 构建页面清单（兼容下游 lists 格式）
    const pageList = buildPageListFromIA(session.iaData.modules, session.iaData.modulePages);
    session.generatedPageList = pageList;
    session.confirmedPageList = pageList;

    // 构建 IA 拓扑
    const td = session.templateData;
    const systemName = td.task?.split(/[,，、]/)[0] || "System";
    session.iaTopology = buildIaTopology(systemName, session.iaData.modules, session.iaData.modulePages, session.iaData.flows);

    // 写入页面清单到 PRD
    session.docBlockContents["page_feature_list"] = formatPageList(session);

    pushMsg(newMessages, session, "assistant",
      `宏观架构已就绪（完成度 ${completionScore(session)}%）！PRD 文档和页面清单已生成。\n\n后续将按照「Page Content → Page Layout → Visual Style」三阶段进入详细设计。`
    );
  }

  sessions.set(sessionId, session);
  return res.json(buildPayload(session, newMessages));
});

// ─── 页面与功能清单 三个接口 ────────────────────────────────────────────────────

// 根据 PRD 内容生成页面清单 + 功能清单
// 新流程：Phase 5 已预生成，直接返回缓存；旧流程/兜底：走 LLM 生成
app.post("/api/lists/generate", async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ message: "会话不存在" });
  }
  const session = sessions.get(sessionId);

  // 如果 Phase 5 已生成页面清单，直接返回
  if (session.generatedPageList?.categories?.length) {
    return res.json({ list: session.generatedPageList });
  }

  // 兜底：从 PRD 内容生成（兼容旧流程 / debug 模式）
  const prdSummary = SECTIONS.slice(0, 5)
    .map((s) => {
      const c = session.docBlockContents[s.sectionId];
      return c ? `【${s.label}】\n${c}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const result = await callJSON(
    "你是产品经理，根据PRD内容生成页面清单和功能清单，只输出JSON，不要解释。",
    `根据以下PRD内容，为该产品生成页面清单和功能清单。\n将页面按功能分类分组（如：主要Tab页面、内容详情页、发布相关页面、用户相关页面等），每个页面列出3-5个最核心的功能点，不要过度细化。\n\nPRD内容：\n${prdSummary}\n\n输出JSON格式：\n{"categories":[{"name":"分类名称","pages":[{"name":"页面名称","features":["功能点1","功能点2","功能点3"]}]}]}`
  );

  if (!result?.categories) {
    return res.status(500).json({ message: "生成失败，请重试" });
  }
  return res.json({ list: result });
});

// 通过自然语言指令 AI 修改清单
app.post("/api/lists/edit", async (req, res) => {
  const { sessionId, currentList, instruction, targetPageNames = [], targetModules = [], referenceImages = [] } = req.body || {};
  if (!currentList || !instruction?.trim()) {
    return res.status(400).json({ message: "缺少 currentList 或 instruction" });
  }

  const mentioned = parseMentionTargets(instruction, collectPageNamesFromList(currentList), sessionId && sessions.has(sessionId) ? (sessions.get(sessionId).pageWireframes || {}) : {});
  if (mentioned.pages.length === 0 && mentioned.modules.length === 0) {
    return res.status(400).json({ message: "严格模式：请在指令中使用 @页面 或 @子模块（如@功能列表/@布局/@渲染）后再修改" });
  }
  const pages = Array.isArray(targetPageNames) && targetPageNames.length ? targetPageNames : mentioned.pages;
  const modules = normalizeTargetModules(
    Array.isArray(targetModules) && targetModules.length ? targetModules : (mentioned.modules.length ? mentioned.modules : ["feature_list"])
  );
  const focusHint = pages.length
    ? `\n优先修改页面：${pages.join("、")}`
    : "\n未指定页面时可全局调整。";
  let listOut = currentList;

  if (modules.includes("feature_list")) {
    const result = await updateFeatureListByScope({
      currentList,
      instruction,
      targetPageNames: pages,
      referenceImages,
    });
    if (!result?.categories) {
      return res.status(500).json({ message: "修改失败，请重试" });
    }
    listOut = result;
  }

  let docBlocks = null;
  let pageHints = {};
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (modules.includes("feature_list") && listOut?.categories) {
      session.confirmedPageList = listOut;
      session.docBlockContents["page_feature_list"] = formatPageList(session);
      docBlocks = composeDocBlocks(session);
    }
    const { updated, pageHints: hints } = await updatePageHintsByScope({
      session,
      targetPageNames: pages,
      targetModules: modules,
      instruction,
      referenceImages,
      mentionedComponents: mentioned.mentionedComponents || [],
    });
    pageHints = hints;
    if (updated) {
      sessions.set(sessionId, session);
      docBlocks = composeDocBlocks(session);
    } else {
      sessions.set(sessionId, session);
    }
  }

  return res.json({
    list: listOut,
    docBlocks,
    pageHints,
    reply: modules.includes("feature_list")
      ? "已根据你的指令更新页面与功能清单。"
      : "已根据你的指令更新页面布局/渲染参考。",
  });
});

// 将确认后的清单同步写入 PRD
app.post("/api/lists/sync", (req, res) => {
  const { sessionId, confirmedList } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ message: "会话不存在" });
  }
  if (!confirmedList?.categories) {
    return res.status(400).json({ message: "缺少 confirmedList" });
  }

  const session = sessions.get(sessionId);
  // 存储确认的清单结构 + 初始化布局存储
  session.confirmedPageList = confirmedList;
  session.pageLayouts = session.pageLayouts || {};
  session.docBlockContents["page_feature_list"] = formatPageList(session);
  sessions.set(sessionId, session);
  return res.json({ docBlocks: composeDocBlocks(session) });
});

// ── 辅助：格式化页面清单（含布局指导 + 渲染规范） ──────────────────────────
function formatPageList(session) {
  const confirmedList = session.confirmedPageList;
  if (!confirmedList?.categories) return "";
  const layouts = session.pageLayouts || {};
  const renders = session.pageRenders || {};
  const renderCodes = session.pageRenderCodes || {};
  const wireframes = session.pageWireframes || {};
  const lines = [];
  if (session.globalRenderSpec) {
    lines.push("【全局渲染】");
    lines.push(session.globalRenderSpec);
    lines.push("");
  }
  for (const cat of confirmedList.categories) {
    if (!(cat.pages || []).some((p) => p.selected !== false)) continue;
    lines.push(`【${cat.name}】`);
    for (const page of (cat.pages || []).filter((p) => p.selected !== false)) {
      lines.push(`  • ${page.name}`);
      for (const feat of (page.features || []).filter((f) => f.selected !== false)) {
        lines.push(`    - ${typeof feat === "string" ? feat : feat.text}`);
      }
      if (layouts[page.name]) {
        lines.push(`    布局描述：${layouts[page.name]}`);
      }
      // 输出组件清单（组件名加粗，便于用户@引用和 AI 精确识别）
      if (Array.isArray(wireframes[page.name]) && wireframes[page.name].length > 0) {
        const compList = wireframes[page.name]
          .map(s => `**${getCompLabelZh(s)}**(${s.shared ? "公共" : "私有"},${Math.round((s.heightRatio || 0) * 100)}%)`)
          .join(" → ");
        lines.push(`    布局组件：${compList}`);
      }
      if (renders[page.name]) {
        lines.push(`    渲染规范：${renders[page.name]}`);
      }
      if (renderCodes[page.name]) {
        lines.push(`    前端代码：已生成`);
      }
    }
  }
  return lines.join("\n");
}

async function generateGlobalRenderSpec(designSystem, pages = []) {
  const isHarmony = designSystem.spec === "harmonyos";
  const libName = isHarmony ? "HarmonyOS 组件库" : ({ antd: "Ant Design", material: "Material UI", ios: "iOS / Apple HIG", custom: "极简自定义" }[designSystem.componentLib] || designSystem.componentLib);
  const themeName = isHarmony ? "鸿蒙品牌色(#0A59F7)" : ({ blue: "蓝色系", warm: "暖橙系", cool: "青蓝系", green: "绿色系", purple: "紫色系" }[designSystem.theme] || designSystem.theme);
  const radiusName = isHarmony
    ? "大圆角(16px)"
    : ({ none: "无圆角", sm: "小圆角(4px)", md: "中圆角(8px)", lg: "大圆角(14px)", pill: "圆形(999px)" }[designSystem.radius] || designSystem.radius);
  const specName = isHarmony ? "鸿蒙规范（HarmonyOS Design）" : ((designSystem.spec === "ios" || designSystem.componentLib === "ios") ? "iOS 规范（Apple HIG）" : "通用规范");
  const pageNames = pages.map((p) => p.name).filter(Boolean).join("、");

  const harmonyHint = isHarmony
    ? "\n特别强调：必须遵循 HarmonyOS Design 设计语言——品牌色#0A59F7、页面底色#F1F3F5、HarmonyHeiTi 字体、大圆角16px卡片、按钮圆角20px、轻投影(0 1px 6px rgba(0,0,0,0.05))、纯净克制的留白风格。主色调固定为鸿蒙品牌色，不使用用户自选主题色。"
    : "";
  const txt = await callText(
    "你是资深UI设计系统专家。输出一段精炼中文规范，不要分点编号，不要JSON。",
    `请生成“全局渲染”说明，长度120-180字。要求：描述本项目统一的颜色、排版、间距、圆角、图标、导航一致性策略；强调这是所有页面共同遵循的渲染基线。\n设计系统：主题=${themeName}，组件库=${libName}，规范=${specName}，圆角=${radiusName}。\n涉及页面：${pageNames || "若干页面"}。${harmonyHint}`
  );
  return (txt || "").trim();
}

// ── 生成高保真渲染规范 ──────────────────────────────────────────────────────
app.post("/api/hifi/generate", async (req, res) => {
  const { sessionId, designSystem, pages } = req.body || {};
  if (!pages?.length || !designSystem) {
    return res.status(400).json({ message: "缺少必要参数" });
  }

  const isIosSpec = designSystem.spec === "ios" || designSystem.componentLib === "ios";
  const isHarmonySpec = designSystem.spec === "harmonyos";
  const libName = isHarmonySpec ? "HarmonyOS 组件库" : ({ antd: "Ant Design", material: "Material UI", ios: "iOS / Apple HIG", custom: "极简自定义" }[designSystem.componentLib] || designSystem.componentLib);
  const themeName = isHarmonySpec ? "鸿蒙品牌色(#0A59F7)" : ({ blue: "蓝色系", warm: "暖橙系", cool: "青蓝系", green: "绿色系", purple: "紫色系" }[designSystem.theme] || designSystem.theme);
  const radiusName = isHarmonySpec
    ? "大圆角(16px)"
    : ({ none: "无圆角", sm: "小圆角(4px)", md: "中圆角(8px)", lg: "大圆角(14px)", pill: "圆形(999px)" }[designSystem.radius] || designSystem.radius);
  const specName = isHarmonySpec ? "鸿蒙规范（HarmonyOS Design）" : (isIosSpec ? "iOS 规范（Apple HIG）" : "通用规范");

  const results    = {};
  const uiContents = {};
  const renderCodes = {};
  const renderCodeMeta = {};

  // Read or initialise shared UI tokens for this session (ensures nav consistency)
  let session = sessionId && sessions.has(sessionId) ? sessions.get(sessionId) : null;
  if (session && !session.sharedNavItems) session.sharedNavItems = null;
  if (session && !session.globalRenderSpec) session.globalRenderSpec = "";

  // ── 跨页公共组件代码缓存（key = Shared_xxx 函数名, value = 完整函数声明字符串）
  if (session && !session.sharedHifiComponents) session.sharedHifiComponents = {};
  // 本次请求内也维护同一份缓存，保证同批次多页互相复用
  const sharedComponentsCache = { ...(session?.sharedHifiComponents || {}) };
  // ── 风格参考代码：第一个成功生成的 renderCode 作为后续页的视觉一致性基线
  if (session && !session.styleReferenceCode) session.styleReferenceCode = "";

  // 设计系统作为全局渲染基线（只生成一次，后续复用，避免每次描述不同导致风格漂移）
  let globalRenderSpec = "";
  if (session) {
    if (session.globalRenderSpec) {
      globalRenderSpec = session.globalRenderSpec;
    } else {
      globalRenderSpec = await generateGlobalRenderSpec(designSystem, pages);
      if (globalRenderSpec) session.globalRenderSpec = globalRenderSpec;
    }
  }

  for (const page of pages) {
    const wireframeSummary = Array.isArray(page.wireframe) && page.wireframe.length > 0
      ? page.wireframe.map((s) => `${s.type}:${s.heightRatio}`).join(" | ")
      : "无";
    // 判断是否为增量渲染修改（已有代码 + 用户明确提了修改要求）
    const existingRenderCode = (page.existingRenderCode || "").trim();
    const isIncrementalRender = !!(existingRenderCode && page.userInput?.trim());

    // 风格参考代码片段（截取前1200字符，包含完整函数示例以便AI精确模仿）
    const styleRef = session?.styleReferenceCode || "";
    const styleRefSnippet = styleRef
      ? styleRef.replace(/function\s+Shared_\w+\([\s\S]*?\n\}/g, "").trim().slice(0, 1200)
      : "";

    const context = [
      `页面名称：${page.name}`,
      `页面分类（仅供参考，不得出现在任何UI文案中）：${page.category}`,
      `核心功能列表（产品能力描述，严禁原样复制为UI文字）：${(page.features || []).join("、")}`,
      `【⚠ 功能→内容转换规则，必须遵守】` +
      `① 功能描述不得作为任何区块的标题、小标题、列表项、按钮文字。` +
      `② 区块标题/小标题应为该区域的语义名称（如"今日健康"而非"查看各项任务进度"）。` +
      `③ 列表项/卡片内容应为真实业务数据（如"喝水 1200/2000ml""睡眠 7h30min"），不是功能描述。` +
      `④ 按钮文字应为动作词（如"打卡""记录""完成"），不是功能描述片段。` +
      `⑤ 示例：功能"切换查看历史/未来日期"→渲染为日期选择器组件，标题为空或"健康日历"，绝对不能出现"切换历史"文字；` +
      `功能"查看各项任务进度"→渲染为进度列表，每项显示"💧 喝水 1200/2000ml""🌙 睡眠 7h30min""🏃 步数 6800/10000"，不能出现"任务进度"文字。`,
      `布局结构：${page.layoutInstructions || "无"}`,
      `低保真线框：${wireframeSummary}`,
      `设计系统：主色调=${themeName}，组件库=${libName}，规范=${specName}，圆角=${radiusName}`,
      globalRenderSpec && `全局渲染基线：${globalRenderSpec}`,
      styleRefSnippet && `【⚠ 风格参考代码（最高优先级 — 必须严格模仿以下代码的视觉风格，包括颜色取值方式、fontSize数值、padding/margin间距、卡片borderRadius和boxShadow、图标用法，偏差视为生成失败）】\n${styleRefSnippet}`,
      page.userInput?.trim() && `用户补充要求：${page.userInput}`,
    ].filter(Boolean).join("\n");

    const userInputNote = page.userInput?.trim()
      ? "\n  6. 结合用户补充要求进行针对性说明"
      : "";

    // If we already have a fixed nav for this project, force the model to reuse it
    const navConstraint = session?.sharedNavItems
      ? `\n\n【重要约束】底部导航(navItems)必须固定使用以下标签，不得修改：${JSON.stringify(session.sharedNavItems)}`
      : "";

    const HIFI_TEMPERATURE = 0.3; // low temperature for consistent code generation
    const MAX_RETRIES = 2;

    let raw;
    let renderCode = "";
    let fromFallback = false;
    let bestRaw = null;
    let lastIssues = [];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (isIncrementalRender) {
        // ── 增量修改模式：在现有代码基础上按用户要求做最小改动 ────────────────
        const incrementalPrompt =
          `【增量渲染修改模式】对以下已有高保真代码，按用户要求做最小化改动。\n\n` +
          `${context}\n\n` +
          `【修改规则（严格遵守）】\n` +
          `1. 仔细阅读"现有renderCode"，理解每个函数的逻辑和样式\n` +
          `2. 只修改用户明确要求改动的部分，未提及的函数、变量、样式一字不改\n` +
          `3. 输出修改后的完整renderCode（包含全部函数定义，不能省略）\n` +
          `4. uiContent 同样只更新与改动相关的字段，其余字段原样保留\n\n` +
          `【现有renderCode】\n${existingRenderCode}\n\n` +
          (page.existingUiContent ? `【现有uiContent】\n${JSON.stringify(page.existingUiContent)}\n\n` : "") +
          `只输出JSON：{"renderInstructions":"修改后的完整渲染规范现状（100字，描述当前UI应呈现的视觉效果、颜色策略、组件选型、数据展示方式，不要描述改了什么，而是描述现在是什么）","renderCode":"完整修改后代码","uiContent":{...更新后的字段}}` +
          navConstraint;
        raw = await callJSON(HIFI_RENDER_SYSTEM_PROMPT, incrementalPrompt, { temperature: HIFI_TEMPERATURE });
      } else {
        // ── 全量生成模式 ──────────────────────────────────────────────────────
        const retryHint = attempt > 0
          ? `\n\n【⚠ 重试提示（第${attempt + 1}次生成）】上一次生成的代码存在以下问题，本次必须修正：\n` +
            (lastIssues.some(i => i.includes("syntax error"))
              ? `- ★ JavaScript 语法错误！常见原因：花括号 {} 不匹配、多余的 ) 或 }、createElement 参数不正确。请逐个检查每个函数的花括号配对。\n`
              : "") +
            `- 所有颜色必须通过 t.primary/t.surface/t.bg/t.text/t.border 引用\n` +
            `- fontSize 标题最大17px，正文13-14px，禁止超过20px\n` +
            `- 禁止 serif/cursive 字体、textShadow、linearGradient\n` +
            `- 卡片阴影只用 "0 1px 8px rgba(0,0,0,0.04)"\n` +
            `- 严禁使用 Emoji 字符，严禁出现页面分类名\n` +
            `上次问题详情：${lastIssues.join("; ")}`
          : "";
        raw = await callJSON(
          HIFI_RENDER_SYSTEM_PROMPT,
          buildHiFiRenderUserPrompt({
            context: context + retryHint,
            isIosSpec,
            isHarmonySpec,
            libName,
            radiusName,
            userInputNote,
            navConstraint,
            wireframe: Array.isArray(page.wireframe) ? page.wireframe : [],
            sharedComponents: sharedComponentsCache,
          }),
          { temperature: HIFI_TEMPERATURE }
        );
      }

      const candidateCode = (raw?.renderCode || "").trim();
      if (candidateCode) {
        const validation = validateAndFixRenderCode(candidateCode);
        if (validation.issues.length > 0) {
          console.log(`[HiFi] Page "${page.name}" attempt ${attempt + 1}: issues found:`, validation.issues);
          lastIssues = validation.issues;
        }
        if (validation.valid) {
          renderCode = validation.code;
          bestRaw = raw;
          break;
        }
        // 仅保留通过语法检查的代码作为候选；语法错误的代码直接丢弃
        if (!validation.issues.some(i => i.includes("syntax error"))) {
          renderCode = validation.code;
        }
        bestRaw = raw;
        if (attempt < MAX_RETRIES) {
          console.log(`[HiFi] Page "${page.name}" attempt ${attempt + 1}: retrying due to quality issues`);
        }
      } else if (attempt === MAX_RETRIES) {
        bestRaw = raw;
      }
    }

    // 所有重试都未产出有效代码 → 清空 renderCode，强制走 fallback
    if (renderCode) {
      const finalCheck = validateAndFixRenderCode(renderCode);
      if (finalCheck.issues.some(i => i.includes("syntax error") || i.includes("missing render"))) {
        console.log(`[HiFi] Page "${page.name}": all attempts produced invalid code, falling to fallback`);
        renderCode = "";
      } else {
        renderCode = finalCheck.code;
      }
    }

    raw = bestRaw;

    const uc = sanitizeUiContent(raw?.uiContent || {}, page.category);

    // First successful navItems wins — lock it for all subsequent pages
    if (session && !session.sharedNavItems && Array.isArray(uc.navItems) && uc.navItems.length === 5) {
      session.sharedNavItems = uc.navItems;
    }
    // Always overwrite with the locked nav so earlier pages stay consistent too
    if (session?.sharedNavItems) {
      uc.navItems = session.sharedNavItems;
    }

    if (!renderCode) {
      renderCode = await generateRenderCodeFallback(context, uc, isIosSpec, isHarmonySpec);
      if (renderCode) {
        const fbValidation = validateAndFixRenderCode(renderCode);
        if (fbValidation.issues.some(i => i.includes("syntax error"))) {
          console.log(`[HiFi] Page "${page.name}": fallback also has syntax error, discarding`);
          renderCode = "";
        } else {
          renderCode = fbValidation.code;
        }
      }
      fromFallback = !!renderCode;
    }

    // ── 提取本页生成的 Shared_xxx 函数，更新缓存，供后续页面复用 ────────────
    if (renderCode) {
      const newShared = extractSharedFunctions(renderCode);
      if (Object.keys(newShared).length > 0) {
        Object.assign(sharedComponentsCache, newShared);
        if (session) Object.assign(session.sharedHifiComponents, newShared);
      }
      // 若本页引用了其他页已生成的 Shared_xxx 但代码中未包含其定义，则前置注入
      renderCode = ensureSelfContained(renderCode, sharedComponentsCache);
      // ── 首次成功且通过质量验证：缓存风格参考代码，供后续页面参考保持一致 ──
      if (session && !session.styleReferenceCode && renderCode.length > 100) {
        const v = validateAndFixRenderCode(renderCode);
        if (v.valid) session.styleReferenceCode = renderCode;
      }
    }

    results[page.name]    = raw?.renderInstructions || "";
    uiContents[page.name] = uc;
    renderCodes[page.name] = renderCode;
    renderCodeMeta[page.name] = {
      hasRenderCode: !!renderCode,
      generatedByFallback: fromFallback,
    };
  }

  let docBlocks = null;
  if (session) {
    if (!session.pageRenders)    session.pageRenders    = {};
    if (!session.pageUiContents) session.pageUiContents = {};
    if (!session.pageRenderCodes) session.pageRenderCodes = {};
    Object.assign(session.pageRenders, results);
    Object.assign(session.pageUiContents, uiContents);
    Object.assign(session.pageRenderCodes, renderCodes);
    session.docBlockContents["page_feature_list"] = formatPageList(session);
    sessions.set(sessionId, session);
    docBlocks = composeDocBlocks(session);
  }

  // ── 自动保存高保真代码到本地 ────────────────────────────────────────────
  saveHiFiToLocal(pages, renderCodes, uiContents, results, designSystem).catch((e) =>
    console.error("[HiFi-Save]", e.message)
  );

  // Return the locked navItems so frontend can sync all already-rendered pages
  const sharedNavItems = session?.sharedNavItems || null;
  return res.json({ results, uiContents, renderCodes, renderCodeMeta, docBlocks, sharedNavItems });
});

// ── 生成页面低保真布局 ──────────────────────────────────────────────────────
app.post("/api/layout/generate", async (req, res) => {
  const { sessionId, pageName, category, features, userInput } = req.body || {};
  if (!pageName || !features) {
    return res.status(400).json({ message: "缺少 pageName / features" });
  }

  // 读取已有公共组件注册表
  const session = sessionId && sessions.has(sessionId) ? sessions.get(sessionId) : null;
  if (session && !session.sharedComponentRegistry) session.sharedComponentRegistry = [];
  const registry = session?.sharedComponentRegistry || [];

  // 构建公共组件约束提示
  const sharedConstraint = registry.length > 0
    ? `\n\n【已有公共组件约束】以下组件已在其他页面定义为公共组件。若本页面需要此类区域，必须使用完全相同的 type 和 heightRatio（label 可根据本页语义微调），不得改变其尺寸比例：\n${registry.map(c => `- ${c.type}（${c.label}，heightRatio=${c.heightRatio}，shared=true，sharedKey="${c.sharedKey}"）`).join('\n')}`
    : "";

  // 判断是否为增量修改模式（前端在 userInput 中标注了【增量修改模式】）
  const isIncrementalMode = typeof userInput === "string" && userInput.includes("【增量修改模式】");

  const context = [
    `页面名称：${pageName}`,
    category && `页面分类：${category}`,
    `功能列表：${(features || []).join("、")}`,
    userInput?.trim() && (isIncrementalMode ? userInput : `用户布局想法：${userInput}`),
  ].filter(Boolean).join("\n");

  const systemPrompt = isIncrementalMode
    ? "你是资深移动端 UI/UX 设计师。当前任务是对现有线框图做最小化增量修改。规则：①只修改与用户明确要求直接相关的区块；②未被提及的区块必须原样保留（type、heightRatio、label、shared、sharedKey 完全不变）；③heightRatio 之和必须等于 1.0；④只输出JSON，不要解释。"
    : "你是资深移动端 UI/UX 设计师，熟悉格式塔设计原则和 Material Design/iOS HIG 规范，根据页面信息生成低保真线框图布局，只输出JSON，不要解释。";

  const mainPrompt = isIncrementalMode
    ? `对以下移动页面的现有线框图做增量修改：\n\n${context}${sharedConstraint}\n\n` +
      `【增量修改规则（严格遵守）】\n` +
      `1. 仔细阅读"现有线框JSON"，理解当前每个区块的 type、heightRatio、label\n` +
      `2. 只对"本次修改要求"中明确提及的功能/区块做改动（新增区块、删除区块、调整高度比）\n` +
      `3. 未被提及的区块：原样复制到输出，type/heightRatio/label/shared/sharedKey 一字不差\n` +
      `4. 若新增区块，heightRatio 从其他区块等比例扣减，确保总和仍为 1.0\n` +
      `5. 若删除区块，将其 heightRatio 均分给相邻内容区块\n` +
      `6. 已有公共约束的 type 必须使用约束里的 heightRatio\n\n` +
      `可用类型：status_bar | nav_bar | search | tabs | banner | list | card_grid | content | form | button | bottom_nav\n\n` +
      `只输出JSON：\n{"componentAnalysis":{"shared":["..."],"private":["..."]},"instructions":"修改后的完整布局现状描述（100-150字，描述修改后整个页面从上到下的区块结构、各区域用途和视觉焦点，不要描述改了什么，而是描述现在是什么）","wireframe":[{"id":"s1","type":"status_bar","label":"状态栏","heightRatio":0.05,"shared":true,"sharedKey":"status_bar"}]}`
    : `根据以下移动页面信息生成低保真线框图布局：\n\n${context}${sharedConstraint}\n\n` +
      `【格式塔设计原则要求】\n` +
      `1. 接近原则：同类元素紧密分组，不同功能区块间留有明显间隔\n` +
      `2. 相似原则：列表项、卡片等同类元素使用完全一致的视觉结构和高度比\n` +
      `3. 连续原则：视线流从顶部状态栏→导航→核心内容→操作区→底导航，自上而下流畅\n` +
      `4. 层级清晰：主要操作区 heightRatio 最大，辅助区次之，固定框架区（状态栏/导航）比例固定\n` +
      `5. 无重叠原则：所有 heightRatio 之和必须精确等于 1.0，禁止出现视觉重叠\n\n` +
      `【heightRatio 参考范围】\n` +
      `status_bar: 0.04-0.05 | nav_bar: 0.08-0.10 | search: 0.07-0.09 | tabs: 0.06-0.08\n` +
      `banner: 0.16-0.22 | list(3-4行): 0.25-0.40 | card_grid(2行): 0.20-0.30\n` +
      `content: 0.18-0.28 | form(2-3字段): 0.20-0.30 | button: 0.08-0.12 | bottom_nav: 0.10-0.12\n\n` +
      `**步骤一：组件分析（componentAnalysis）**\n` +
      `判断每个区域是"公共组件"(shared)还是"私有组件"(private)：\n` +
      `- shared: 跨多页复用的固定框架区域，如：状态栏、通用顶部导航栏、底部 Tab 导航\n` +
      `- private: 本页面专属内容区域，如：Banner、列表流、表单、详情内容\n\n` +
      `**步骤二：布局说明（instructions，100-150字）**\n` +
      `描述整体结构和视觉设计意图：从上到下各区块用途、视觉焦点、主操作路径\n\n` +
      `**步骤三：线框图（wireframe，5-8个区块）**\n` +
      `- heightRatio 之和 = 1.0（精确）\n` +
      `- 每个区块声明 shared 和 sharedKey\n` +
      `- 已有公共约束的 type 必须使用约束里的 heightRatio\n\n` +
      `可用类型：status_bar | nav_bar | search | tabs | banner | list | card_grid | content | form | button | bottom_nav\n\n` +
      `【常见 App 页面布局模板参考（根据页面类型选取最适合的模板，在此基础上微调）】\n` +
      `模板A — 首页/看板页（信息密度高、快速浏览）：\n` +
      `  status_bar(0.04) → nav_bar(0.08) → banner/概览卡片(0.18) → card_grid/指标网格(0.25) → list/任务列表(0.25) → button/快捷操作(0.10) → bottom_nav(0.10)\n` +
      `模板B — 列表详情页（浏览型，如任务列表、商品列表）：\n` +
      `  status_bar(0.04) → nav_bar(0.08) → search(0.07) → tabs/筛选(0.06) → list/内容列表(0.55) → bottom_nav(0.10) → button/悬浮操作(0.10)\n` +
      `模板C — 详情/说明页（阅读型，如规则说明、科普）：\n` +
      `  status_bar(0.04) → nav_bar(0.08) → banner/头图(0.18) → content/正文内容(0.50) → button/操作按钮(0.10) → bottom_nav(0.10)\n` +
      `模板D — 表单/设置页（操作型，如新增、编辑、配置）：\n` +
      `  status_bar(0.04) → nav_bar(0.08) → content/说明区(0.12) → form/表单(0.38) → button/提交(0.10) → content/辅助说明(0.18) → bottom_nav(0.10)\n` +
      `模板E — 弹窗/半屏页（轻量交互）：\n` +
      `  nav_bar/标题栏(0.10) → content/说明(0.20) → card_grid或list/主体内容(0.40) → button/操作(0.15) → content/底部补充(0.15)\n` +
      `模板F — 数据看板页（图表型，如体重、运动数据）：\n` +
      `  status_bar(0.04) → nav_bar(0.08) → tabs/时间维度(0.06) → banner/数据摘要(0.16) → content/图表区域(0.28) → list/明细列表(0.18) → bottom_nav(0.10) → button/操作(0.10)\n\n` +
      `注意：以上比例仅供参考，实际请根据页面功能调整，但必须保持总和=1.0。\n\n` +
      `只输出JSON：\n{"componentAnalysis":{"shared":["..."],"private":["..."]},"instructions":"布局说明","wireframe":[{"id":"s1","type":"status_bar","label":"状态栏","heightRatio":0.05,"shared":true,"sharedKey":"status_bar"}]}`;

  const result = await callJSON(systemPrompt, mainPrompt);

  if (!result?.instructions || !Array.isArray(result?.wireframe)) {
    return res.status(500).json({ message: "生成失败，请重试" });
  }

  // 归一化 heightRatio（防止 LLM 误差）
  const total = result.wireframe.reduce((s, sec) => s + (sec.heightRatio || 0), 0);
  if (total > 0 && Math.abs(total - 1) > 0.01) {
    result.wireframe = result.wireframe.map((s) => ({ ...s, heightRatio: (s.heightRatio || 0) / total }));
  }

  // ── 更新公共组件注册表 ───────────────────────────────────────────────────────
  if (session) {
    for (const sec of result.wireframe) {
      if (!sec.shared || !sec.sharedKey) continue;
      const existing = registry.find(c => c.sharedKey === sec.sharedKey);
      if (!existing) {
        // 首次定义：登记入注册表
        registry.push({ type: sec.type, label: sec.label, heightRatio: sec.heightRatio, sharedKey: sec.sharedKey });
      } else if (isIncrementalMode) {
        // 用户主动修改模式：信任 AI 输出，更新注册表以同步跨页变更
        existing.type = sec.type;
        existing.label = sec.label;
        existing.heightRatio = sec.heightRatio;
      } else {
        // 自动初始生成：强制使用已登记的值，保证跨页一致
        sec.heightRatio = existing.heightRatio;
        sec.label = existing.label;
      }
    }
    session.sharedComponentRegistry = registry;
  }

  // 将布局结果（wireframe + 描述）同步到 session，供后续修改时作为上下文
  let docBlocks = null;
  if (session) {
    if (!session.pageLayouts)    session.pageLayouts    = {};
    if (!session.pageWireframes) session.pageWireframes = {};
    session.pageLayouts[pageName]    = result.instructions;
    session.pageWireframes[pageName] = result.wireframe;   // 存储完整组件列表
    session.docBlockContents["page_feature_list"] = formatPageList(session);
    sessions.set(sessionId, session);
    docBlocks = composeDocBlocks(session);
  }

  // 用 wireframe 中文标签重建 componentAnalysis，确保显示名一致、不含英文 type
  const derivedComponentAnalysis = {
    shared:  result.wireframe.filter(s =>  s.shared).map(s => getCompLabelZh(s)),
    private: result.wireframe.filter(s => !s.shared).map(s => getCompLabelZh(s)),
  };

  return res.json({
    instructions: result.instructions,
    wireframe: result.wireframe,
    componentAnalysis: derivedComponentAnalysis,
    sharedComponentRegistry: session?.sharedComponentRegistry || [],
    docBlocks,
  });
});

// PRD 精炼：用户用自然语言修改 PRD
app.post("/api/chat/refine", async (req, res) => {
  const { sessionId, message, targetPageNames = [], targetModules = [], referenceImages = [] } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ message: "会话不存在" });
  }
  if (!message?.trim()) {
    return res.status(400).json({ message: "message 不能为空" });
  }

  const session = sessions.get(sessionId);
  const pageNames = collectPageNamesFromList(session.confirmedPageList || {});
  const mentioned = parseMentionTargets(message, pageNames, session.pageWireframes || {});
  if (mentioned.pages.length === 0 && mentioned.modules.length === 0) {
    return res.status(400).json({ message: "严格模式：请在输入中使用 @页面 或 @子模块（如@功能列表/@布局/@渲染）后再修改" });
  }
  const pages = Array.isArray(targetPageNames) && targetPageNames.length ? targetPageNames : mentioned.pages;
  const modules = normalizeTargetModules(
    Array.isArray(targetModules) && targetModules.length ? targetModules : (mentioned.modules.length ? mentioned.modules : ["feature_list"])
  );
  const scopedMessage = [
    message,
    pages.length ? `（重点页面：${pages.join("、")}）` : "",
    modules.length ? `（重点子模块：${modules.join("、")}）` : "",
    (pages.length || modules.length) ? "（强约束：优先只改@对应内容，其他内容仅酌情微调）" : "",
  ].filter(Boolean).join("\n");
  const result = await refineAgent(session, scopedMessage);

  const validIds = new Set(SECTIONS.map((s) => s.sectionId));
  const scopedMode = pages.length > 0 || modules.length > 0;
  const allowedWhenScoped = new Set(["page_feature_list"]);
  for (const [sId, content] of Object.entries(result.updates || {})) {
    if (scopedMode && !allowedWhenScoped.has(sId)) continue;
    if (validIds.has(sId) && typeof content === "string") {
      session.docBlockContents[sId] = content;
    }
  }

  let updatedList = null;
  if (modules.includes("feature_list") && session.confirmedPageList?.categories) {
    const listResult = await updateFeatureListByScope({
      currentList: session.confirmedPageList,
      instruction: message,
      targetPageNames: pages,
      referenceImages,
    });
    if (listResult?.categories) {
      session.confirmedPageList = listResult;
      session.docBlockContents["page_feature_list"] = formatPageList(session);
      updatedList = listResult;
    }
  }

  const { updated, pageHints } = await updatePageHintsByScope({
    session,
    targetPageNames: pages,
    targetModules: modules,
    instruction: message,
    referenceImages,
    mentionedComponents: mentioned.mentionedComponents || [],
  });

  if (updated) {
    // keep reply concise but indicate scoped page modules were updated
    result.reply = result.reply || "已按范围更新。";
  }
  sessions.set(sessionId, session);

  return res.json({
    reply: result.reply || "已更新，请在右侧查看。",
    docBlocks: composeDocBlocks(session),
    pageHints,
    list: updatedList,
  });
});

// 段落排序
app.post("/api/doc/reorder", (req, res) => {
  const { sessionId, order } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ message: "会话不存在" });
  }
  const session = sessions.get(sessionId);
  const blocks = composeDocBlocks(session);
  const map = new Map(blocks.map((b) => [b.blockId, b]));
  const reordered = order
    .map((id, i) => { const b = map.get(id); return b ? { ...b, order: i + 1 } : null; })
    .filter(Boolean);
  return res.json({ sessionId, docBlocks: reordered });
});

// 保存当前 PRD 到本地文件（按时间命名）
app.post("/api/prd/save", async (req, res) => {
  try {
    const { sessionId, docBlocks } = req.body || {};
    let blocks = [];

    if (Array.isArray(docBlocks) && docBlocks.length > 0) {
      blocks = docBlocks;
    } else if (sessionId && sessions.has(sessionId)) {
      blocks = composeDocBlocks(sessions.get(sessionId));
    }

    if (!blocks.length) {
      return res.status(400).json({ message: "没有可保存的 PRD 内容" });
    }

    const saveDir = path.resolve(__dirname, "../../saved-prd");
    await fs.mkdir(saveDir, { recursive: true });

    const filename = buildTimestampFilename("prd", "md");
    const filePath = path.join(saveDir, filename);
    const markdown = formatPrdMarkdown(blocks);

    await fs.writeFile(filePath, markdown, "utf8");
    return res.json({ ok: true, filename, filePath });
  } catch (e) {
    console.error("[PRD-SAVE]", e);
    return res.status(500).json({ message: "保存失败，请稍后重试" });
  }
});

// 会话恢复
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ message: "会话不存在" });
  return res.json(buildPayload(session));
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 统一返回 JSON 错误，避免前端拿到 HTML 错页
app.use((err, _req, res, _next) => {
  if (!err) return res.status(500).json({ message: "未知错误" });
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "上传内容过大，请减少图片数量或压缩后重试" });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ message: "请求体 JSON 格式错误" });
  }
  console.error("[UNHANDLED]", err);
  return res.status(500).json({ message: "服务异常，请稍后重试" });
});

// ── 调试模式：预置宠物社区App数据，直接跳到阶段二 ─────────────────────────────
app.post("/api/debug/preset", async (_req, res) => {
  const sessionId = "debug-" + Date.now();
  try {
    const mdPath = path.resolve(__dirname, "../../saved-prd/prd_20260402_033210.md");
    const md = await fs.readFile(mdPath, "utf8");
    const parsed = parsePrdMarkdownToDebugData(md);
    const docBlocks = parsed.docBlocks;
    const pageList = parsed.pageList;
    const session = {
      sessionId,
      done: true,
      currentSection: null,
      docBlockContents: Object.fromEntries(docBlocks.map((b) => [b.blockId, b.content])),
      docBlocks,
      newMessages: [],
      pageLayouts: {},
      pageRenders: {},
      pageUiContents: {},
      confirmedPageList: { categories: pageList },
    };
    sessions.set(sessionId, session);
    return res.json({ sessionId, docBlocks, pageList });
  } catch (e) {
    console.error("[DEBUG-PRESET]", e);
    return res.status(500).json({ message: "调试数据加载失败" });
  }
});

// ── 任务流步骤展开 ─────────────────────────────────────────────────────────────
app.post("/api/taskflow/expand", async (req, res) => {
  const { sessionId, fromPageName, toPageName, connectionLabel, fromFeatures, toFeatures, existingSteps, userInstruction } = req.body || {};
  if (!fromPageName || !toPageName) {
    return res.status(400).json({ message: "缺少页面信息" });
  }

  const session = sessionId && sessions.has(sessionId) ? sessions.get(sessionId) : null;
  const prdCtx = session
    ? SECTIONS.slice(0, 3).map((s) => {
        const c = session.docBlockContents[s.sectionId];
        return c ? `【${s.label}】${c.slice(0, 120)}` : null;
      }).filter(Boolean).join("\n")
    : "";

  const isEditMode = !!(existingSteps && userInstruction);

  const systemPrompt = isEditMode
    ? "你是资深产品交互设计师。当前任务是根据用户指令修改已有的任务流中间步骤。修改可能涉及：增/删步骤、修改触发/描述/功能点、调整步骤数量。只输出JSON，不要解释。"
    : "你是资深产品交互设计师，擅长拆解用户操作路径，推断真实App中两个页面之间的完整中间流程。只输出JSON，不要解释。";

  const editSection = isEditMode
    ? `\n【当前已有步骤】\n${existingSteps}\n\n【用户修改指令】\n${userInstruction}\n\n请根据以上指令修改步骤，输出修改后的完整步骤列表。\n`
    : `\n请严格根据以上两个页面的具体功能和状态，推断用户从起点到终点之间必须经过的中间页面（弹窗/选择页/确认页/过渡状态等）。\n`;

  const result = await callJSON(
    systemPrompt,
    `用户流程：从「${fromPageName}」通过「${connectionLabel}」进入「${toPageName}」\n\n` +
    `起点页面「${fromPageName}」功能列表：${(fromFeatures || []).join("、") || "（未提供）"}\n` +
    `终点页面「${toPageName}」功能列表：${(toFeatures || []).join("、") || "（未提供）"}\n` +
    (prdCtx ? `\n产品背景：\n${prdCtx}\n` : "") +
    editSection +
    `\n输出JSON：\n` +
    `{"steps":[{"id":"s1","name":"页面名称（4-8字，具体到该页作用）","trigger":"触发进入此页的用户操作（10-20字，如：点击立即购买按钮）","description":"此页面的作用说明（15-25字）","features":["功能点1","功能点2","功能点3"]}]}\n\n` +
    `严格要求：\n` +
    `1. 生成 2-4 个中间步骤，每步代表用户真实看到的一个独立页面/弹窗\n` +
    `2. 每步必须有明确的 trigger（什么操作导致进入此步），体现交互链条\n` +
    `3. features 列表 3-5 项，必须与该步骤的实际页面功能对应（不要写泛化描述）\n` +
    `4. 所有内容必须基于起点和终点页面的具体功能推断，不得使用与这两个页面无关的通用流程\n` +
    `5. 步骤符合真实 App 设计模式（如：点击购买→选规格弹窗→填写地址→确认订单页→支付中→支付结果页）`
  );

  if (!Array.isArray(result?.steps) || result.steps.length === 0) {
    return res.status(500).json({ message: "生成失败，请重试" });
  }

  return res.json({
    steps: result.steps.map((s, i) => ({
      id: s.id || `step_${i}`,
      name: s.name || s.title || `步骤${i + 1}`,
      trigger: s.trigger || "",
      description: s.description || "",
      features: Array.isArray(s.features) ? s.features : [],
    })),
  });
});

// ── 任务流生成 ────────────────────────────────────────────────────────────────
app.post("/api/taskflow/generate", async (req, res) => {
  const { sessionId, pageList } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ message: "会话不存在" });
  }
  const session = sessions.get(sessionId);

  // Flatten selected pages with id
  const pageSummary = (pageList || []).flatMap((cat) =>
    (cat.pages || [])
      .filter((p) => p.selected !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: cat.name,
        features: (p.features || [])
          .filter((f) => f.selected !== false)
          .map((f) => (typeof f === "string" ? f : f.text))
          .slice(0, 4),
      }))
  );

  const prdSummary = SECTIONS.slice(0, 5)
    .map((s) => {
      const c = session.docBlockContents[s.sectionId];
      return c ? `【${s.label}】${c.slice(0, 200)}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const validIds = new Set(pageSummary.map((p) => p.id));
  const pageListForPrompt = JSON.stringify(
    pageSummary.map((p) => ({ id: p.id, name: p.name, category: p.category })),
    null, 2
  );

  const result = await callJSON(
    "你是产品设计专家，根据产品PRD和页面清单，生成该产品中2-4个典型用户任务流图。只输出JSON，不要解释。",
    `产品PRD摘要：\n${prdSummary}\n\n页面清单（每项包含id和名称）：\n${pageListForPrompt}\n\n` +
    `请分析该产品有哪些典型用户场景，为每个场景生成一条任务流，输出JSON格式：\n` +
    `{"flows":[{"title":"用户XXX完整流程（10字以内）","connections":[{"id":"可省略","from":"页面id","to":"页面id","label":"触发跳转操作（8字以内）"}]}]}\n` +
    `严格要求：\n` +
    `1. flows 含 2-4 条典型任务流，覆盖不同用户场景（如注册登录、核心功能、设置等）\n` +
    `2. 每条 flow 的 connections 只描述「本场景内用户实际经过的页面跳转」，4-10 条为宜；不要包含与本场景无关的页面，也不要把未参与本流程的页面写进 connections\n` +
    `3. from、to 必须是上面页面列表中真实存在的 id，且 from≠to\n` +
    `4. label 表示用户在 from 页上触发的、导致跳到 to 的操作（去程与回程若不同须用不同描述）\n` +
    `5. 【双向跳转必须拆成两条边】若用户既可能从 A 到 B，也可能从 B 回到 A，必须输出两条独立的 connection：一条 from=A,to=B（label₁），另一条 from=B,to=A（label₂）。禁止合并成一条、禁止用「往返」等一条边表示两个方向\n` +
    `6. 多条 connection 在数组中各自独立，顺序按用户动线先后即可`
  );

  if (!Array.isArray(result?.flows) || result.flows.length === 0) {
    return res.status(500).json({ message: "生成失败，请重试" });
  }

  // Filter invalid edges; assign globally unique ids (per flow index + edge index) so A→B 与 B→A 永不共用一个 id
  const flows = result.flows
    .filter((f) => f.title && Array.isArray(f.connections))
    .map((f, flowIdx) => ({
      title: f.title,
      connections: f.connections
        .filter((c) => c.from && c.to && validIds.has(c.from) && validIds.has(c.to) && c.from !== c.to)
        .map((c, i) => ({
          id: `tf_f${flowIdx}_e${i}_${c.from}_${c.to}`,
          from: c.from,
          to: c.to,
          label: String(c.label || "").trim() || "跳转",
        })),
    }));

  return res.json({ flows });
});

// ── 静态端点：鸿蒙组件库 JS ─────────────────────────────────────────────────
app.get("/api/harmony-lib.js", (_req, res) => {
  res.type("application/javascript").send(HARMONY_COMPONENT_LIB_CODE);
});

// ── 任务流一键生成（新模式）────────────────────────────────────────────────
taskflowOneClick.registerRoutes(app, { callJSON, callText, extractJSON, callVisionJSON });

// ── Pixso MCP 集成（设计系统同步）────────────────────────────────────────
pixsoRoutes.registerRoutes(app);

app.listen(PORT, () => console.log(`Backend API listening on http://localhost:${PORT}`));
