"use strict";
/**
 * HM DSL Skill - 让 LLM 输出组件树 JSON 而非 [OLD]/[NEW] HTML。
 *
 * 暴露三个函数：
 *   buildDslPrompt(currentReq, prevHtmlOutline, allRequirements?) → string
 *   parseDslResponse(raw)                                          → HMRoot
 *   listAvailableComponents()                                      → ComponentSpec[]
 */

const components = require("./components");

/**
 * 列出可用组件 + 关键 props（用于注入 prompt）。
 * 这里硬编码 schema，因为各组件的 props 推断不便（JS 没有原生类型注解）。
 */
function listAvailableComponents() {
  return [
    { name: "Page",            props: "background?, width?, height?",                  desc: "完整页面容器（与 FullscreenPanel 同），不透明白底" },
    { name: "FullscreenPanel", props: "background?",                                   desc: "全屏覆盖面板，不透明背景" },
    { name: "StatusBar",       props: "time?='08:08', signal?='5G', battery?=100",     desc: "系统状态栏" },
    { name: "NavBar",          props: "title, leftIcon?='arrow_back', rightIcon?, align?='left'|'center'", desc: "顶部导航栏 56px" },
    { name: "SegmentedTabs",   props: "items: string[], active: number, variant?='underline'|'pill'", desc: "横向 segmented tab" },
    { name: "Grid",            props: "columns: number, gap?=16, padding?",            desc: "CSS Grid 网格（永远 repeat(N,1fr)）" },
    { name: "Column",          props: "gap?, padding?, align?, justify?, background?, width?, maxWidth?, borderRadius?, shadow?", desc: "纵向 flex 容器；同时可充当卡片：传 background/borderRadius/shadow 即可" },
    { name: "IconCard",        props: "icon: string, label: string, selected?",        desc: "图标 + label 卡片" },
    { name: "ListItem",        props: "title, subtitle?, leftIcon?, height?, divider?", desc: "列表项（右 slot 用 children 传）" },
    { name: "Checkbox",        props: "checked?=false, size?=22",                      desc: "复选框" },
    { name: "Button",          props: "label, variant?='primary'|'secondary'|'warning'|'text', size?='compact'|'regular'|'large', disabled?, block?, icon?",  desc: "胶囊按钮（pill 圆角）" },
    { name: "Banner",          props: "text, variant?='warning'|'info'|'success', closable?",  desc: "顶部告警横幅" },
    { name: "Spinner",         props: "size?=42, color?, text?",                       desc: "圆环加载指示" },
    { name: "OverlayMask",     props: "opacity?=0.4, color?='#000', blur?=0",          desc: "半透明遮罩，子节点居中" },
    { name: "Badge",           props: "count?, color?, size?, offsetTop?, offsetRight?", desc: "红点/数字徽标（建议配 append 模式）" },
    { name: "Icon",            props: "name: string, size?=24, color?",                desc: "Material Icons 名（自动用 HM Symbol 字体渲染）" },
    { name: "Text",            props: "text?, variant?='title'|'subtitle'|'body'|'caption', size?, weight?, color?, align?", desc: "文本节点；简单文本也可直接写在 children 字符串里" },
    { name: "Row",             props: "gap?, padding?, align?, justify?, wrap?, background?, width?, maxWidth?, borderRadius?, shadow?", desc: "横向 flex 容器（Column 的横向双生）；同样可加 background/borderRadius/shadow 充当横条 Banner" },
    { name: "TextInput",       props: "placeholder?, value?, icon?, suffix?, size?='compact'|'regular'|'large', invalid?, disabled?",     desc: "文本输入框；invalid=true 时边框变红（校验失败用）" },
    { name: "FormField",       props: "label?, required?, error?, helper?, placeholder?, value?, icon?, suffix?, labelWidth?",            desc: "🎯 行内字段校验首选：label + 输入框 + 错误文本，一个节点全搞定。error 有值 → 输入框红边框 + 下方红字提示" },
    { name: "FieldError",      props: "text, icon?='error', size?='sm'|'md', marginTop?=4",                                               desc: "独立红色错误提示文本（行内字段校验场景）；配 injection.mode='append' 可贴在 base 输入框下方" },
  ];
}

// F22：检测 description/implementation_method 是否含"画面完全一致"类关键词
function detectInheritIntent(desc, impl) {
  const text = `${desc || ""} ${impl || ""}`;
  return /完全一致|完全相同|保持一致|保持不变|画面与.*相同|DOM.*保持.*与|结构.*一致|仅.{1,6}变更|只.{0,3}是|唯一区别|无.{0,3}变化|其余.*保持|其它.*保持|其他.*保持/.test(text);
}

function buildDslPrompt({ currentReq, prevHtmlOutline = "", allRequirements = [] }) {
  const compsTxt = listAvailableComponents()
    .map(c => `  ${c.name.padEnd(16)}  ${c.props}\n      → ${c.desc}`)
    .join("\n");

  const stateName = currentReq.state_name || "";
  const desc = currentReq.description || "";
  const impl = currentReq.implementation_method || "";
  const lastState = currentReq.last_state || null;

  return `你是 HarmonyOS UI 描述师。把下面这个 state 翻译成"组件树 JSON"。

==================【绝对禁止】==================
- 不要写 HTML 任何一个标签
- 不要写 CSS 任何一行
- 不要写 inline style
- 不要给出 [OLD]/[NEW] 块
- 不要发明清单里没有的组件 type（如 "Title"、"Header"、"Section"、"Spacer"、"Modal"、"Toast" 等都不存在）
- 纯文本直接用 children:"文字内容" 字符串即可，简短文字可不包 Text 组件
- 任何"标题"用 Text variant="title" 或直接 NavBar.title prop；任何"小提示"用 Text variant="caption"

==================【可用组件清单（v0）】==================
${compsTxt}

==================【输出格式 - 严格 JSON】==================
直接输出一个 JSON 对象（不要 markdown 包裹）。

⚠️ 关键格式规则：每个组件节点的 props **必须**嵌套在 "props" 对象里，
**禁止**把 icon/label/title 等字段直接平铺到节点根（这是最常见的错误！）。

【✅ 正确示例】
{
  "state_name": "${stateName.replace(/"/g, '\\"')}",
  "lifecycle": "persistent",
  "injection": { "mode": "overlay", "z_index": 9999 },
  "inherit_skeleton": false,
  "tree": {
    "type": "Page",
    "props": { "background": "#FFFFFF" },
    "children": [
      { "type": "StatusBar" },
      { "type": "NavBar", "props": { "title": "Preferences", "leftIcon": "arrow_back" } },
      { "type": "Grid", "props": { "columns": 3, "gap": 16 }, "children": [
        { "type": "IconCard", "props": { "icon": "account_balance", "label": "金融" } },
        { "type": "IconCard", "props": { "icon": "school", "label": "教育" } }
      ]}
    ]
  }
}

【❌ 错误示例】（icon/label 平铺到节点根，会导致渲染空白）
{ "type": "IconCard", "icon": "school", "label": "教育" }

【网格列数硬约束】
- 360px 宽屏，Grid 列数 columns ≤ 3
- 7 个卡片用 columns=3（3+3+1）或 columns=4
- 绝对不要 columns=7 或 columns=6（会挤成无法识别的小方块）

==================【模式选择规则】==================
- 全屏新页面 / 全屏面板 / 弹窗：injection.mode = "overlay"，z_index=9999
- 在某个 base 元素旁加红点/标记：injection.mode = "append"，anchor = "#目标id"
- 整体替换 base 内某区块：injection.mode = "replace"，anchor = "#目标id"

==================【🎯 行内字段校验失败 - 专项规则】==================
当 state 描述包含「字段校验失败」「输入错误提示」「红色提示」「行内校验」时：

✅ 首选方案：injection.mode = "overlay"（最稳！），用 FormField 复合组件重画整个表单
{
  "injection": { "mode": "overlay", "z_index": 9999 },
  "inherit_skeleton": false,
  "tree": {
    "type": "Page",
    "children": [
      { "type": "StatusBar" },
      { "type": "NavBar", "props": { "title": "注册" } },
      { "type": "Column", "props": { "gap": 16, "padding": 16 }, "children": [
        { "type": "FormField", "props": { "label": "手机号", "required": true, "value": "13800000", "error": "手机号格式不正确" } },
        { "type": "FormField", "props": { "label": "验证码", "required": true, "placeholder": "请输入" } },
        { "type": "Button", "props": { "label": "下一步", "block": true, "disabled": true } }
      ]}
    ]
  }
}

❗ 关键：FormField 的 error 是字符串 → 输入框边框自动变红 + 下方出现"⚠ 错误文本"
   不要写两个节点（TextInput + FieldError），FormField 一个搞定！

✅ 备选方案：单独使用 FieldError，配 injection.mode="append"，anchor 指向 base 的输入框 id
   仅当你确认 base HTML 里能找到这个输入框选择器时再用，否则用上面的 overlay 全表单重画。

==================【lifecycle 选择】==================
- temporary: 弹窗/浮层/Toast/Loading 等"临时态"（后续 state 会自动消失）
- persistent: 持久 UI 变化（如"打开了一个新页面"，"新增了一个按钮"）

==================【inherit_skeleton 选择 ⚠️ 默认 true】==================
🚨 **强烈默认 inherit_skeleton: true**（90%+ 的 case 应选 true）。

为什么默认 true：
- base HTML 几乎总是从 D2C 导出，**自带顶部状态栏 + 底部 Tab 导航**（项目结构里 \`Pixso-frame-XXX\` 包含
  \`Pixso-frame-XXX-StatusBar\` + \`Pixso-frame-XXX-BottomTab\`）。
- description / implementation_method 经常明说"顶部状态栏完整可见"/"底部Tab栏保留"——这就是 inherit_skeleton:true 的信号。
- inherit_skeleton:false 你**必须自画** StatusBar + BottomTab，但 LLM 自画的常常跟 base 不一致 → 视觉两套 chrome 重叠或丢失。

- true (默认): base 状态栏 + 底导透出。你的 tree 只画**新内容**（卡片 / 表单 / 浮层）。
- false (极少): 真正"完全脱离 base 风格"的全新页（如设置页 / 启动页 / 完全不同视觉的页面）。

📌 判定（命中即 inherit_skeleton:true）：
   description 含"顶部状态栏"或"状态栏完整可见"或"底部Tab栏保留"或"保留 BottomTab"
   description 含"全屏页"但未明说"重画状态栏"——99% 仍应 true
   description 含"弹窗 / 浮层 / Toast / loading / 遮罩 / 浮卡"

📌 真实事故 (v34 new_test/2 state_2)：
   description 写"顶部状态栏与底部Tab栏完整可见"，LLM 选 inherit_skeleton:false 自画 → 截图丢 status bar + BottomTab。

==================【⚠️ "画面与 X 完全一致" 守则（铁律 H DSL 版）】==================
${detectInheritIntent(desc, impl) ? `
🚨 检测到 description 含 **"完全一致 / 保持一致 / 完全相同 / 仅 XXX 变更"** 关键词。
这意味着 base（last_state=${lastState} 的 HTML 快照）**已经是用户期望画面的 95%+**，
你**严禁**重画整个 form / 卡片 / 列表。

❌ 严禁：tree.type=Page / FullscreenPanel + 自画 NavBar+表单+按钮 → 跟 base 重复 + 错位
❌ 严禁：把 base 已有的"项目集名称输入框 / 公司单选 / 添加项目卡 / 确认按钮"在 tree 里重画一遍
❌ 严禁：临时拍脑袋加新内容（如"项目列表 (2)" / "项目A / 项目B" / "可见范围"）—— description 没要求的不许加

✅ 必须：inherit_skeleton: true（base 透出，你只画**增量差异**）
✅ 必须：tree 极简，只含 description 里**真正新增 / 修改的那部分**：
   - "校验失败态" → tree 只画**红色错误条 / 红字提示**（FieldError + Banner），不画整个表单
   - "提交中态"   → tree 只画**遮罩 + 灰色 spinner 按钮**（OverlayMask + Button），不画表单
   - "成功态"     → tree 只画**顶部 Toast 横条**（Row 含 check icon + 文字），不画表单
   - "错误态"     → tree 只画**红色错误提示**（FieldError / Banner），不画整个表单

📌 真实事故 (v33 new_test/2)：
   - state_3 description 写"页面结构与初始态完全一致，只是输入框变红 + 加错误提示" → LLM 自画了
     "项目集名称 / 项目类型 / 标准项目 / 敏捷项目 / 已添加项目(2) / 项目 A / 项目 B / 灰色确认" 整个新表单
     → 截图跟 state_2 的初始态完全不像（多了根本不在蓝图里的项目列表）
   - state_4 description 写"页面结构与初始态完全一致，只是底部按钮变 spinner 提交中" → LLM 自画了
     "项目集名称 / 可见范围 / 仅自己 / 团队内 / 关联项目 / 项目 A / 项目 B / 蓝色提交中按钮"
     → base 的"公司/个人 / 添加项目 / 红色确认" 全部不见了

📌 判定（命中即必须遵守）：
   "页面结构与初始态完全一致" / "页面其他元素保持不变"
   "DOM 结构 / 样式 / 文本 / 位置均保持与 state_X 一致" 
   "画面与 last_state 完全相同" / "其他界面元素无变化"
   "仅 XXX 变更" / "唯一区别" / "只是 XXX"

🎯 reminder：你不是"页面设计师"，base 已经画好了。你是"差异补丁师"，只补 description 提到的差异。
` : `(本 state description 未命中"完全一致"关键词，按正常逻辑画 tree 即可)`}

==================【当前需求】==================
state_name : ${stateName}
description: ${desc}
implementation_method: ${impl}
last_state : ${lastState}

==================【输出】==================
直接输出 JSON，不要任何解释/markdown/前后缀。
`;
}

/**
 * 解析 LLM 返回的 raw 文本 → HMRoot 对象。
 * 支持的格式：
 *   - 直接 JSON
 *   - ```json ... ``` 代码块包裹的 JSON
 *   - 前后有解释文字的情况（取第一个 { ... } 完整对象）
 */
function parseDslResponse(raw) {
  if (typeof raw !== "string") throw new Error("DSL response 不是 string");
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) throw new Error("DSL response 不含合法 JSON 对象");
  const body = s.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch (e) {
    // 兜底：用轻量 JSON 修复尝试一次（处理 LLM 漏逗号 / 多逗号 / 缺括号等常见错）
    try {
      const repaired = repairLooseJson(body);
      return JSON.parse(repaired);
    } catch (_) {
      throw new Error(`DSL JSON parse 失败：${e.message}`);
    }
  }
}

/**
 * JSON 修复（处理 LLM 常见 5 类错）：
 *   1) 数组/对象末尾多余逗号
 *   2) 深层漏逗号：}"key" / ]"key" / }{ / ][ / ]{ / }[ / "v""k" 之间补逗号
 *   3) JS 风格未引号 key（{ foo: 1 } → { "foo": 1 }）
 *   4) 末尾 JS 单行注释 // 整行去掉
 *   5) 未闭合的尾部花括号 / 方括号（按统计补齐）
 *
 * 修复过程严格只在字符串字面量之外操作。
 */
function repairLooseJson(s) {
  let t = s;
  // 1) 末尾逗号
  t = t.replace(/,(\s*)([}\]])/g, "$1$2");
  // 4) 删除单行注释（仅字符串外）
  t = stripJsonLineComments(t);
  // 2) 深层补逗号 + 3) key 加引号（一次扫描）
  t = scanFixCommasAndKeys(t);
  // 5) 栈式补齐未闭合括号（保持 LIFO 顺序）
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of t) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      // 弹出最近匹配的开括号；如果栈顶不匹配也强行弹（容错）
      if (stack.length) stack.pop();
    }
  }
  while (stack.length) t += stack.pop();
  return t;
}

/** 字符串字面量外的 // 行注释整行删除。 */
function stripJsonLineComments(s) {
  let out = "";
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (inStr) {
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { out += ch; inStr = false; continue; }
      out += ch;
      continue;
    }
    if (ch === '"') { out += ch; inStr = true; continue; }
    if (ch === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++;
      if (i < s.length) out += "\n";
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * 一次扫描：在字符串外补缺失的逗号 + 给未加引号的 key 加引号。
 * 缺逗号情形：前一个 token 是 } ] " 数字 或 字面值（true/false/null），
 *           下一个 token 是 " { [，且之间只有空白 / 换行。
 */
function scanFixCommasAndKeys(s) {
  const out = [];
  let inStr = false, esc = false;
  // 上一个非空白非注释字符（在串外）
  let lastTok = null; // 可能是 } ] " 0-9 t/f/n（字面值开头）等
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out.push(ch); esc = false; continue; }
    if (inStr) {
      out.push(ch);
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = false; lastTok = '"'; continue; }
      continue;
    }
    if (ch === '"') {
      // 进入字符串前：如果 lastTok 是 } ] " 或值字符，补一个 ,
      if (lastTok === "}" || lastTok === "]" || lastTok === '"' || isJsonValueEnd(lastTok)) {
        out.push(",");
      }
      out.push(ch);
      inStr = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      if (lastTok === "}" || lastTok === "]" || lastTok === '"' || isJsonValueEnd(lastTok)) {
        out.push(",");
      }
      out.push(ch);
      lastTok = ch;
      continue;
    }
    if (ch === "}" || ch === "]") {
      out.push(ch);
      lastTok = ch;
      continue;
    }
    if (ch === "," || ch === ":") {
      out.push(ch);
      lastTok = ch;
      continue;
    }
    if (/\s/.test(ch)) { out.push(ch); continue; }
    // 其他字符（数字、字面值字母、未加引号的 key 字母）：累积识别
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++;
      const word = s.slice(i, j);
      // 看下一个非空白字符是不是 : -> 是未加引号 key
      let k = j;
      while (k < s.length && /\s/.test(s[k])) k++;
      if (s[k] === ":" && !["true", "false", "null"].includes(word)) {
        // 把 word 加上引号；如果 lastTok 是 } ] " 或值结束，先补 ,
        if (lastTok === "}" || lastTok === "]" || lastTok === '"' || isJsonValueEnd(lastTok)) {
          out.push(",");
        }
        out.push(`"${word}"`);
      } else {
        // 字面值（true/false/null）或非法 token
        if (lastTok === "}" || lastTok === "]" || lastTok === '"' || isJsonValueEnd(lastTok)) {
          out.push(",");
        }
        out.push(word);
      }
      lastTok = "v"; // 标记"值结束"
      i = j - 1;
      continue;
    }
    if (/[\d\-+.]/.test(ch)) {
      let j = i;
      while (j < s.length && /[\dEe+\-.]/.test(s[j])) j++;
      const num = s.slice(i, j);
      if (lastTok === "}" || lastTok === "]" || lastTok === '"' || isJsonValueEnd(lastTok)) {
        out.push(",");
      }
      out.push(num);
      lastTok = "v";
      i = j - 1;
      continue;
    }
    // 其他字符原样输出
    out.push(ch);
    lastTok = ch;
  }
  return out.join("");
}

function isJsonValueEnd(tok) {
  return tok === "v";
}

/**
 * 判断某个 state 是否适合走 DSL 路径。
 * 策略：
 *   1) currentReq.use_dsl 显式覆盖
 *   2) state_id===1（base 初始页）必不走 DSL
 *   3) 默认走 DSL，除非明显是"原地按钮变色 / Toggle 切换 / 输入框显示值"等不适合的场景
 *   4) DSL 编译失败会自动回落到旧路径，所以"激进 + 兜底"比"保守"覆盖率更高
 */
function shouldUseDsl(currentReq) {
  if (!currentReq) return false;
  if (currentReq.use_dsl === false) return false;
  if (currentReq.use_dsl === true) return true;
  if (currentReq.state_id === 1) return false;
  const txt = `${currentReq.state_name || ""} ${currentReq.description || ""} ${currentReq.implementation_method || ""}`;
  // 排除明显"原地状态变化"（这类需要精确改 base 内某个按钮/输入框）
  const inplaceOnly = /^(原地|按钮变色|按钮.*变化|高亮|toggle|切换激活|输入框显示|输入框值|纯文本.*?变化)/i.test(txt)
    || (/原地/.test(txt) && !/全屏|页|弹窗|浮层|Toast|Banner|遮罩|蒙层|loading|加载/i.test(txt));
  if (inplaceOnly) return false;
  return true;
}

module.exports = {
  listAvailableComponents,
  buildDslPrompt,
  parseDslResponse,
  shouldUseDsl,
};
