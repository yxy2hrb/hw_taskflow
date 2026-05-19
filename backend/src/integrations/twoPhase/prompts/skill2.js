// ──────────────────────────────────────────────────────────────────────
// Skill 2 — 单个 edit 执行 prompt 模板（按 type 路由）
//
// 当前策略：
//   text-edit / delete          → 输出 [OLD][NEW] HTML 块（inline-style 微改）
//   state-toggle / new-overlay  → 直接输出 NEW HTML 片段（不走 DSL）
//
// 说明：
//   - 按用户要求，state-toggle/new-overlay 改为直接生成 HTML 片段替换；
//   - 不再要求鸿蒙 DSL 组件树，不再要求 HM 规范约束；
//   - 风格保持简洁统一，重点保证可见性、位置、尺寸与锚点替换稳定性。
// ──────────────────────────────────────────────────────────────────────
"use strict";

const { CORE_10_RULES, HM_DESIGN_SUMMARY, languageHint } = require("./common");
const { listAvailableComponents } = require("../../hmDsl/skill");

// ===== inline-style 模式（text-edit / delete）=====

const OUTPUT_FORMAT_RULE = `==================【输出格式 - 唯一允许的形态】==================
只输出 1 个替换块，**不要任何 Markdown / 自然语言 / JSON / 解释**：

[OLD]
<逐字来自 base 的原片段（与传入的 anchor 完全一致）>
[NEW]
<改造后的片段；如果是删除任务，[NEW] 留空即可>

❌ 严禁：[OLD]/[NEW] 之外的任何字符；禁止输出"0 个块"等说明性文字；禁止 [/OLD][/NEW]。`;

/** ① text-edit —— 最瘦 prompt（无鸿蒙规范、无组件参考） */
function buildSkill2TextEdit({ edit, languagePrimary }) {
  return `
你是 UI 代码修改助手。任务：对一段 HTML 做"文字 / 属性 / 状态 class"级别的小幅修改。

${languageHint(languagePrimary)}

${OUTPUT_FORMAT_RULE}

==================【硬约束摘要】==================
- [OLD] 必须与下方 anchor 完全一致（逐字、空格、注释一致）；
- [NEW] 只动需要改的字符 / 属性 / inline style，DOM 结构与子节点数保持不变；
- 不要新增任何 div / span / class，更不要复用 Pixso id。

==================【anchor（即 OLD）】==================
${edit.anchor}

==================【修改指示】==================
${edit.instruction}

现在输出 1 个 [OLD][NEW] 块。
`.trim();
}

/** ② delete —— 极瘦 prompt */
function buildSkill2Delete({ edit, languagePrimary }) {
  return `
你是 UI 代码删除助手。任务：把 base HTML 中的一段元素**整段删除**（[NEW] 留空）。

${languageHint(languagePrimary)}

${OUTPUT_FORMAT_RULE}

==================【anchor（即 OLD，整段删除）】==================
${edit.anchor}

==================【删除原因（参考，不影响输出）】==================
${edit.instruction}

现在输出 1 个 [OLD][NEW] 块（[NEW] 段为空）。
`.trim();
}

// ===== DSL 模式（state-toggle / new-overlay）=====

/** 把组件清单格式化进 prompt（一次，长度可控）。 */
function buildDslComponentManifest() {
  return listAvailableComponents()
    .map(c => `  ${c.name.padEnd(16)}  ${c.props}\n      → ${c.desc}`)
    .join("\n");
}

/** DSL 模式共用的输出格式 + 关键规则块。 */
const DSL_OUTPUT_FORMAT_RULE = `==================【输出格式 - 严格 JSON】==================
直接输出一个 JSON 对象，且**只输出一个 JSON 对象**：

{
  "tree": { "type": "<组件名>", "props": { ... }, "children": [ ... ] }
}

⚠️ 严格规则：
- **禁止** 输出 [OLD]/[NEW] 块、Markdown 包裹、自然语言解释；
- **禁止** 写 HTML 任何一个标签、CSS 任何一行、inline style；
- **禁止** 把 icon/label/title 等字段直接平铺到节点根，必须放进 "props" 对象；
- **禁止** 使用清单里没有的组件 type（如 "Title"、"Header"、"Section"、"Modal"、"Toast"、"Dialog" 都不存在）；
- 纯文本直接用 children:"文字" 字符串即可；标题用 Text variant="title" 或 NavBar.title prop。

【✅ 正确 props 嵌套】
  { "type": "Button", "props": { "label": "Confirm", "variant": "primary" } }
【❌ 错误平铺】
  { "type": "Button", "label": "Confirm" }     ← 渲染时 label 取不到`;

const DSL_COMMON_HARD_RULES = `==================【DSL 硬约束】==================
- ✅ 文本输入框用 \`TextInput\`（自动 100% 宽度，不会被父容器挤窄）；带 label/校验时用 \`FormField\`
- ✅ "拓扑图 / 网络图 / 设备示意图 / 图表占位 / 城市图 / 头像图片" 等任何位图类视觉，
    **必须用 \`Image\` 组件**：\`{ "type":"Image", "props": { "placeholder":"topology|network|chart|device|city|abstract",
    "width":"100%", "height":180, "borderRadius":8 } }\`。
    禁止只放 \`Text\` 写"拓扑图（SVG渲染）"/"图片"占位文字——会被截图当成空白。
- ✅ Radio 单选选项请用 \`Checkbox\`（圆形复选框；DSL 没有独立 Radio 组件）：
    用 Row 把 Checkbox 和文字 Text 横向排在一起 → 这样选项才会有文字标签。
- ✅ 按钮用 \`Button\`（自动胶囊圆角 / disabled / loading 等样式）
- ✅ 列表项用 \`ListItem\`；4+ 个同类卡片用 \`Grid\` columns≤3
- ✅ 半透明遮罩 + 居中卡片：外层 \`OverlayMask\`，里面塞一个 \`Column\` 容器即可
- ❌ 不要发明任何 inline style——所有样式由组件 props 控制
- ❌ 不要写 type:"Page"/"FullscreenPanel" 嵌另一个 type:"Page"（一层就够）

==================【⚠️ Spinner（loading 指示）— 单节点硬约束】==================
\`Spinner\` 组件**自带** \`text\` prop（圆环下方 12px 处会渲染一行 Medium 字号文字），
所以 "spinner + 文字提示" 永远是**一个节点**，不是两个：

  ✅ 正确（单节点，文字写在 Spinner.props.text）：
     { "type": "Spinner", "props": { "size": 32, "color": "#191919", "text": "保存中…" } }

  ❌ 错误（Column 套 Spinner + 平行 Text，文字会**重复 2 行**叠加）：
     {
       "type": "Column",
       "children": [
         { "type": "Spinner", "props": { "text": "保存中…" } },
         { "type": "Text",    "children": "保存中…" }                  ← 重复！
       ]
     }
     ↑ v9 test3 state_3 翻车现场就是这种重复，截图里两行"保存中…"叠在一起。

📌 任何"圆环 + 加载文字 / 提交中 / 上传中 / 处理中…"场景，**只写一个 Spinner 节点**即可。
   外层只需要 OverlayMask（半透明遮罩），不需要再嵌 Column 包裹 Spinner——OverlayMask 内部已经居中。`;

/** state-toggle 专属硬约束（"在原位变形"语义） */
const DSL_STATE_TOGGLE_RULES = `==================【state-toggle 专属规则】==================
本次输出 tree 会**整体替换** anchor 这一段原片段。所以你给的 tree 应当是
"目标态的视觉"（如 loading 中的按钮、checked 的复选框、填好值的输入框）。

- 如果 anchor 是个按钮 → tree 用 Button + props.disabled=true / 或 children 改文字 / 加 loading
- 如果 anchor 是个按钮且 instruction 提到"spinner / loading / 加载 / 提交中" → 优先用
  \`Button\` 的 \`loading:true\`，不要输出 \`icon:"spinner"\`；如需显式图标，只能用
  \`icon:"progress_activity"\`。必须按 instruction 传 \`background\` / \`color\` /
  \`border\` / \`size\`，不要用 \`variant:"secondary"\` 代替灰色禁用态。
- 如果 anchor 是个开关 → tree 用 Checkbox 或 Button（DSL 没有 Switch；用 Button 模拟）
- 如果 anchor 是个输入框 → tree 用 TextInput / FormField，props.value 填新值；
                            校验失败用 FormField + props.error 文本（自动红边框 + 红字）
- 如果 anchor 是个列表区且要变"空状态" → tree 用 Column 居中放 Icon + Text("No content")

==================【⚠️ 骨架屏 / 占位条 视觉对比度硬约束】==================
当 instruction 涉及"骨架屏 / skeleton / loading 占位 / 灰色占位条"时：
- 不要发明 type:"Skeleton"（不存在！）；用 Column / Row 嵌套带背景色的小 div 写法不行（不许 inline style）。
- 推荐做法：用 \`Spinner\` props.text="Loading..." 一个组件搞定（最稳）；
- 或用 \`Column\` 嵌多个 \`Text\` variant="caption" 占位文字（如 "····················"）模拟占位条。
- ❌ 严禁用 background:#F1F3F5 / #F3F3F3 / #F5F5F5 / #FAFAFA 等浅灰色（与页面背景同色，截图肉眼看不见）。`;

/** new-overlay 专属硬约束 */
const DSL_NEW_OVERLAY_RULES = `==================【new-overlay 专属规则】==================
本次输出 tree 会**追加到 anchor 之后**作为浮层。所以 tree 必须是"可见、占满
合理位置"的浮层根节点：

- 全屏新页面 → tree 根用 \`Page\`，children 顺序：StatusBar → NavBar → 主体；
  ⚠ 但**多 id 锚（anchor 是数组）**意味着 skill1 已经把内容区子 frame 单独圈出来替换、
    顶部状态栏 / 顶导 / 底导都在 base 里保留——这时**严禁**用 \`Page\`/\`FullscreenPanel\`
    （那是 position:fixed inset:0 z-index:9999 全屏覆盖，会把 base 的底导挡死），
    也**严禁**画 \`StatusBar\` / \`NavBar\` / \`BottomTab\` 子组件（base 已有，画了会重叠）；
    tree 根改用普通 \`Column\` 或 \`Row\`，里面直接放内容（表单 / 卡片 / 图表 / 占位图等）。
- 弹窗 / Dialog → tree 根用 \`OverlayMask\`，里面**唯一**子节点是一个**带卡片样式的** \`Column\`；
- 内嵌下拉 / Dropdown / Popover / "无遮罩菜单" → **严禁**用 \`OverlayMask\`。
  tree 根必须用 \`Column\` 或 \`Row\`，并显式传
  \`position:"fixed"\`、\`top\`、\`left\`、\`zIndex\`、\`background:"#FFFFFF"\`、
  \`borderRadius\`、\`shadow:true\`。它应该贴近触发入口下方，而不是居中覆盖全屏。
- Toast / Snackbar（窄条提示，居中浮在某处） → tree 根用 \`Row\` 并**显式传** \`position:"fixed"\` + 定位 props（见下方"Toast 位置硬模板"）；不要套 OverlayMask（Toast 不应该把 base 盖黑）；不要用 Banner（Banner 是 100% 宽贴边的告警栏，截图里跟 Toast 视觉差别很大）；
- 抽屉 / 侧滑 → 暂用 \`FullscreenPanel\`（DSL 没有半屏抽屉组件，用全屏面板近似）；
- Loading 模态 → tree 根用 \`OverlayMask\`，里面**只放一个** \`Spinner\` props.text="Loading..."（**不要再加平行 Text** —— Spinner 自带 text 渲染，加 Text 会重复 2 行；详见上方 Spinner 单节点硬约束）。

==================【🍞 Toast / Snackbar 位置硬模板（v9 翻车场景修复）】==================
Toast 必须**自己浮起来**——\`Row\` 默认是文档流元素，不传 \`position\` 截图里它就会塞进 anchor
所在的文档流位置（v9 test3 state_5 翻车原因：Row 没 position 直接被丢在 \`<head>\` 末尾，肉眼看不到）。

所以"红底白字 Toast / 黑底 Snackbar / 绿色成功提示"这类窄条提示，**必须**给 Row 加这套定位 props：

  ✅ 顶部居中（顶部状态栏下方 16px）：
     "position": "fixed", "top": "calc(32px + 16px)", "left": "50%", "transform": "translateX(-50%)", "zIndex": 10000
  ✅ 底部居中（底部 Tab 上方 16px）：
     "position": "fixed", "bottom": "calc(56px + 16px)", "left": "50%", "transform": "translateX(-50%)", "zIndex": 10000

完整范例（红底 Toast：保存失败提示）：
{
  "tree": {
    "type": "Row",
    "props": {
      "background": "#D32F2F",
      "borderRadius": 8,
      "padding": [12, 16],
      "gap": 12,
      "align": "center",
      "width": "fit-content",
      "position": "fixed",
      "top": "calc(32px + 16px)",
      "left": "50%",
      "transform": "translateX(-50%)",
      "zIndex": 10000
    },
    "children": [
      { "type": "Icon", "props": { "name": "error", "size": 20, "color": "#FFFFFF" } },
      { "type": "Text", "props": { "color": "#FFFFFF" }, "children": "Save failed. Please retry." }
    ]
  }
}

成功 Toast 也必须是"窄条悬浮提示"，不是 Banner：
- \`width\` 必须是 \`"fit-content"\` 或固定窄宽（如 \`"160px"\` / \`"220px"\`），禁止 \`"100%"\`；
- 必须 \`left:"50%"\` + \`transform:"translateX(-50%)"\`，禁止 \`left:"0"\` 贴满屏幕；
- 必须传 \`shadow:true\` 或 \`shadow:"0 4px 12px rgba(0,0,0,0.06)"\`；
- 成功色优先用 \`#64BB5C\`，不要发明刺眼绿色；
- 若用户明确要求"通栏 / Banner / 全宽提示"，才允许 \`width:"100%"\`。

==================【▾ Dropdown / Popover 无遮罩硬模板】==================
当 instruction / state_name / description 出现 "下拉"、"内嵌菜单"、"Popover"、"Dropdown"、
"无遮罩"、"不遮挡状态栏与底Tab" 时，输出必须类似：
{
  "tree": {
    "type": "Column",
    "props": {
      "position": "fixed",
      "top": 88,
      "left": 20,
      "width": 360,
      "background": "#FFFFFF",
      "borderRadius": 8,
      "padding": [12, 20],
      "gap": 16,
      "shadow": true,
      "zIndex": 10000
    },
    "children": [
      { "type": "Text", "props": { "variant": "body", "size": 16 }, "children": "项目工作台" },
      { "type": "Text", "props": { "variant": "body", "size": 16 }, "children": "团队工作台" },
      { "type": "Text", "props": { "variant": "body", "size": 16 }, "children": "个人工作台" }
    ]
  }
}
❌ 严禁：Dropdown / Popover 用 \`OverlayMask\`；那会把背景压暗并把菜单居中，和蓝图相反。

==================【🎯 弹窗卡片硬模板（最常翻车场景，必看！）】==================
弹窗类（Dialog / Confirm / FilterPanel / 顶部 Banner 等）的子卡片**必须**用
\`Column\` + 以下 4 个 props 把它变成"真正的卡片"，否则会铺满整个屏幕宽度看起来像
没有面板：

  ✅ 必传：background="#FFFFFF"
  ✅ 必传：borderRadius=16
  ✅ 必传：maxWidth=320      （或 280 / 343；不要写 "100%"）
  ✅ 必传：padding=24         （或 [20, 24]）
  ✅ 建议：shadow=true        （自带 "0 8px 32px rgba(0,0,0,0.12)"，更立体）
  ✅ 建议：gap=16             （子节点之间均匀间距）
  ✅ 建议：width="auto"       （让 maxWidth 起作用；默认是 100% 会覆盖 maxWidth）

❌ 反例：OverlayMask 直接套 Column 但 Column 不带 background / borderRadius
   → 渲染出来面板内容直接漂浮在遮罩上、与底层资讯混叠，**严重视觉事故**。

==================【⚠️ 静态可见红线】==================
本 state 的截图是**最终可见态**，没有任何动画会触发。
- ❌ 不要假设有 transition / animation —— DSL 组件已经表达"最终态"
- ❌ 不要用 OverlayMask props.opacity=0（直接不可见）
- ❌ 不要用 OverlayMask props.opacity > 0.8（base 完全被盖住）—— 推荐 0.4 ~ 0.55
- ✅ 半透明遮罩的"居中卡片"：OverlayMask → Column（按上面"弹窗卡片硬模板"传 props）

==================【📦 单选选项 / Radio 排版（最常翻车场景之二）】==================
DSL 没有独立 Radio。要做"○ 选项文字" 这种单选：用 **Row + Checkbox + Text**，且
Row 必须显式 \`align="center"\` 让圆圈与文字垂直对齐；Row 之间用外层 Column gap=12 分行。

  ✅ 正确：
    { "type": "Column", "props": { "gap": 12 }, "children": [
       { "type": "Row", "props": { "gap": 12, "align": "center" }, "children": [
          { "type": "Checkbox", "props": { "checked": false, "size": 22 } },
          { "type": "Text", "props": { "variant": "body" }, "children": "Latest to earliest" }
       ]},
       ...
    ]}
  ❌ 错误：把 Text 当 Checkbox 的 children → Checkbox 无文字
  ❌ 错误：Row 不写 align="center" → 圆圈和文字垂直错位`;

const DSL_AVAILABLE_COMPONENTS_BLOCK = `==================【可用组件清单（v0）—— 只能用这些 type】==================
${buildDslComponentManifest()}`;

const DSL_GOOD_EXAMPLES_BLOCK = `==================【✅ 范例输出】==================
[弹窗：确认下载视频 —— 注意 Column 卡片样式 4 件套]
{
  "tree": {
    "type": "OverlayMask",
    "props": { "opacity": 0.4 },
    "children": [
      {
        "type": "Column",
        "props": {
          "background": "#FFFFFF",
          "borderRadius": 16,
          "width": "auto",
          "maxWidth": 280,
          "padding": 24,
          "shadow": true,
          "gap": 16,
          "align": "stretch"
        },
        "children": [
          { "type": "Text", "props": { "variant": "title" }, "children": "Confirm download" },
          { "type": "Text", "props": { "variant": "body" }, "children": "Are you sure you want to download this video?" },
          {
            "type": "Row",
            "props": { "gap": 12, "justify": "end" },
            "children": [
              { "type": "Button", "props": { "label": "Cancel", "variant": "secondary" } },
              { "type": "Button", "props": { "label": "Confirm", "variant": "primary" } }
            ]
          }
        ]
      }
    ]
  }
}

[筛选面板：Time / Popularity 单选 + Content 标签 + 底部按钮]
{
  "tree": {
    "type": "OverlayMask",
    "props": { "opacity": 0.4 },
    "children": [
      {
        "type": "Column",
        "props": {
          "background": "#FFFFFF",
          "borderRadius": 16,
          "width": "auto",
          "maxWidth": 320,
          "padding": 24,
          "shadow": true,
          "gap": 20,
          "align": "stretch"
        },
        "children": [
          { "type": "Text", "props": { "variant": "title", "align": "center" }, "children": "Filter" },
          {
            "type": "Column",
            "props": { "gap": 8 },
            "children": [
              { "type": "Text", "props": { "variant": "subtitle" }, "children": "Time" },
              { "type": "Column", "props": { "gap": 12 }, "children": [
                { "type": "Row", "props": { "gap": 12, "align": "center" }, "children": [
                  { "type": "Checkbox", "props": { "checked": false, "size": 22 } },
                  { "type": "Text", "props": { "variant": "body" }, "children": "Latest to earliest" }
                ]},
                { "type": "Row", "props": { "gap": 12, "align": "center" }, "children": [
                  { "type": "Checkbox", "props": { "checked": false, "size": 22 } },
                  { "type": "Text", "props": { "variant": "body" }, "children": "Earliest to latest" }
                ]}
              ]}
            ]
          },
          {
            "type": "Column",
            "props": { "gap": 8 },
            "children": [
              { "type": "Text", "props": { "variant": "subtitle" }, "children": "Content" },
              {
                "type": "Row",
                "props": { "gap": 8, "wrap": true },
                "children": [
                  { "type": "Button", "props": { "label": "AI", "variant": "secondary", "size": "compact" } },
                  { "type": "Button", "props": { "label": "5G", "variant": "secondary", "size": "compact" } },
                  { "type": "Button", "props": { "label": "Cloud", "variant": "secondary", "size": "compact" } },
                  { "type": "Button", "props": { "label": "IoT", "variant": "secondary", "size": "compact" } }
                ]
              }
            ]
          },
          {
            "type": "Row",
            "props": { "gap": 12, "justify": "space-between" },
            "children": [
              { "type": "Button", "props": { "label": "Clear all", "variant": "text" } },
              { "type": "Button", "props": { "label": "Confirm", "variant": "primary" } }
            ]
          }
        ]
      }
    ]
  }
}

[顶部 Banner Toast：黄色冲突提示]
{
  "tree": {
    "type": "Row",
    "props": {
      "background": "#FFF9E6",
      "borderRadius": 8,
      "padding": [12, 16],
      "gap": 12,
      "align": "center",
      "justify": "space-between"
    },
    "children": [
      { "type": "Row", "props": { "gap": 8, "align": "center" }, "children": [
        { "type": "Icon", "props": { "name": "warning", "size": 20, "color": "#FFA32D" } },
        { "type": "Text", "props": { "variant": "body" }, "children": "Don't mix 'All' with other tags" }
      ]},
      { "type": "Icon", "props": { "name": "close", "size": 20, "color": "#999999" } }
    ]
  }
}

[空状态：列表区变 "No content"]
{
  "tree": {
    "type": "Column",
    "props": { "gap": 12, "padding": 32, "align": "center", "justify": "center" },
    "children": [
      { "type": "Icon", "props": { "name": "inbox", "size": 48, "color": "rgba(0,0,0,0.4)" } },
      { "type": "Text", "props": { "variant": "subtitle" }, "children": "No content matches your filters" },
      { "type": "Text", "props": { "variant": "caption" }, "children": "Try adjusting your filter criteria" }
    ]
  }
}`;

/** ③ state-toggle —— DSL 模式 */
function buildSkill2StateToggleDsl({ edit, languagePrimary }) {
  const isMultiAnchor = Array.isArray(edit.anchor) && edit.anchor.length > 1;
  // state-toggle 任意 anchor 形式（单 id / 多 id）都是"在 base 里替换某段子 frame"，
  // 绝不应该画 chrome 或全屏覆盖。
  const inlineHint = `
==================【⚠️ state-toggle = base 内嵌替换（关键）】==================
${isMultiAnchor
  ? `skill1 给的 anchor 是数组（${edit.anchor.length} 个 id）：${JSON.stringify(edit.anchor)}\nreplace_at = "${edit.replace_at || edit.anchor[0]}"\n这 ${edit.anchor.length} 个内容子 frame 会被一起删除，你生成的 tree 落到 replace_at 那一段。`
  : `skill1 给的 anchor 是单个 id：${JSON.stringify(edit.anchor)}\n该 id 对应 base 里的一个内容子 frame，你生成的 tree 直接替换它。`}

**base 自带的状态栏 / 顶导 / 底导都在 base 里保留**（不在 anchor 范围内），你**不要再画 chrome**：
  ❌ 严禁 tree.type = "Page" / "FullscreenPanel"（position:fixed inset:0 z-index:9999 会盖死 base 的底导）
  ❌ 严禁 children 里出现 StatusBar / NavBar / BottomTab / TabBar
  ✅ tree 根改用 \`Column\` / \`Row\`，里面直接放内容（表单 / 卡片 / 占位图等）

📌 真实事故案例：
  - v26 new_test/2 state_2 "创建项目集"：LLM 用 tree.type=Page → 全屏覆盖把 base 底导（首页/商城/工作台/服务/我的）盖死，截图显示 LLM 重画的错误底导
  - v26 new_test/3 state_3：LLM 给的顶层卡片锚 + Page tree → 卡片错位 + 内容半截
后端会做兜底剥离（Page→Column + 移除 StatusBar/NavBar/BottomTab），但 LLM 输出符合规范能避免 normalize 报错。
`;
  const multiAnchorHint = inlineHint;
  return `
你是 HarmonyOS UI 描述师。任务：把一段 HTML 元素**就地改写为新的视觉状态**
（按钮 loading / disabled、toggle on/off、checkbox checked、输入框预填值/校验失败、
列表区变空状态等）。你不直接输出 HTML——只输出一个 HMNode 组件树 JSON，
后端会用 hmDsl 编译器把它渲染成最终 HTML。
${multiAnchorHint}

${languageHint(languagePrimary)}

${CORE_10_RULES}

${HM_DESIGN_SUMMARY}

${DSL_AVAILABLE_COMPONENTS_BLOCK}

${DSL_OUTPUT_FORMAT_RULE}

${DSL_COMMON_HARD_RULES}

${DSL_STATE_TOGGLE_RULES}

${DSL_GOOD_EXAMPLES_BLOCK}

==================【anchor（即将被替换的原片段）】==================
${edit.anchor}

==================【修改指示】==================
${edit.instruction}

现在输出 1 个 JSON 对象，只含 "tree" 字段。
`.trim();
}

/** ④ new-overlay —— DSL 模式 */
function buildSkill2NewOverlayDsl({ edit, languagePrimary, stateName }) {
  return `
你是 HarmonyOS UI 描述师。任务：在 base HTML 中**新增一个可见浮层**
（弹窗 / Toast / 全屏覆盖页 / 抽屉 / Loading 模态等）。你不直接输出 HTML——
只输出一个 HMNode 组件树 JSON，后端会用 hmDsl 编译器把它渲染成最终 HTML，
再追加到 anchor 元素之后。

state name: ${stateName}

${languageHint(languagePrimary)}

${CORE_10_RULES}

${HM_DESIGN_SUMMARY}

${DSL_AVAILABLE_COMPONENTS_BLOCK}

${DSL_OUTPUT_FORMAT_RULE}

${DSL_COMMON_HARD_RULES}

${DSL_NEW_OVERLAY_RULES}

${DSL_GOOD_EXAMPLES_BLOCK}

==================【anchor（即将插入到此元素之后）】==================
${edit.anchor}

==================【浮层内容指示】==================
${edit.instruction}

现在输出 1 个 JSON 对象，只含 "tree" 字段。
`.trim();
}

// ===== 派发 =====

/**
 * 按 type 派发到对应 prompt 模板。
 *
 * @returns {{ prompt: string, outputMode: "inline" | "dsl" }}
 *   outputMode 告诉 patcher 用什么方式解析 LLM 的返回：
 *     - "inline" → parseBlocks([OLD][NEW]) 字符串裸操作
 *     - "dsl"    → parseDslResponse(raw) → compileDslFragment(tree) → 装配 block
 */
function buildSkill2Prompt({ edit, languagePrimary, stateName }) {
  switch (edit.type) {
    case "delete":
      return {
        prompt: buildSkill2Delete({ edit, languagePrimary }),
        outputMode: "inline",
      };
    case "state-toggle":
      return {
        prompt: buildSkill2StateToggleHtml({ edit, languagePrimary }),
        outputMode: "html",
      };
    case "new-overlay":
      return {
        prompt: buildSkill2NewOverlayHtml({ edit, languagePrimary, stateName }),
        outputMode: "html",
      };
    case "text-edit":
    default:
      return {
        prompt: buildSkill2TextEdit({ edit, languagePrimary }),
        outputMode: "inline",
      };
  }
}

const STABLE_ID_RULE = `==================【🧷 稳定 id 硬约束（A+C — 修复跨态可锚定性）】==================
你生成的 HTML 里，**所有可被独立修改的视觉/交互单元**必须带一个稳定 id，命名规范：

  id="hm-<role>"        // 例：id="hm-title-bar" / id="hm-name-input" / id="hm-confirm-btn"

🟢 必须打 id 的元素（缺一不可，按页面里出现的实际元素选择）：
  - 顶部标题栏 / NavBar          → id="hm-title-bar"
  - 主体内容容器（外层 wrapper）  → id="hm-main"
  - 输入框 / TextInput            → id="hm-<语义>-input"      (如 hm-name-input)
  - 单选 / 复选按钮组             → id="hm-<语义>-radios"
  - 卡片 / Card                   → id="hm-<语义>-card"
  - 主按钮 / 提交按钮             → id="hm-<语义>-btn"        (如 hm-confirm-btn / hm-cancel-btn)
  - 错误提示文字 / Tip 行         → id="hm-<语义>-tip"
  - 顶部黄/红条提示 / Banner      → id="hm-<语义>-banner"

🟡 命名要求：
  - 用 ASCII 小写字母 + 数字 + 连字符；不要中文 id；
  - <role> 要语义化（confirm-btn / name-input / 行业-radios），不要随便写 box1/div1；
  - 同 role 多个时加数字：hm-radio-1 / hm-radio-2。

🔴 反例（会让下一态找不到子锚点）：
  - 整个全屏页只有外层 1 个 hm-main，里面所有按钮、输入框都没有 id ❌
    → 下一态想"仅改按钮颜色"时只能锚到 hm-main 全替换，丢内容；
  - id 重复（同一片段出现 2 次 id="hm-confirm-btn"）❌；
  - 用 D2C 风格 id="14_xxxx" 假装稳定 id（D2C id 由设计稿决定，不属于你能控制）❌。

📌 这套 id 体系让"下一态做小范围修改时能精准锚到具体子元素"，是规划-生成跨态稳定的关键。`;

function buildSkill2StateToggleHtml({ edit, languagePrimary }) {
  return `
你是资深前端工程师。任务：根据 instruction 生成一个“用于替换 anchor 的 NEW HTML 片段”。

${languageHint(languagePrimary)}

==================【输出格式（唯一允许）】==================
只输出如下结构，不要其它文字：
<!-- NEW_HTML_START -->
<这里是最终 NEW HTML 片段>
<!-- NEW_HTML_END -->

==================【硬约束】==================
- 只输出 NEW 片段，不要输出 [OLD]，不要解释。
- NEW 必须是可直接渲染的 HTML + 内联样式（必要时可含 <style>）。
- 风格统一：圆角、间距、字号、颜色协调，不要夸张视觉。
- instruction 若要求“全新页面/新卡片/新区域”，必须显式给出尺寸与位置（width/height/top/left/padding 等），保证可见。
- instruction 若要求“保留状态栏/底部Tab”，不要在 NEW 中重画它们。

${STABLE_ID_RULE}

==================【anchor（平台将替换它，不需要你重复输出 OLD）】==================
${Array.isArray(edit.anchor) ? JSON.stringify(edit.anchor) : edit.anchor}

==================【replace_at（仅多锚点场景）】==================
${edit.replace_at || ""}

==================【修改指示】==================
${edit.instruction}
`.trim();
}

function buildSkill2NewOverlayHtml({ edit, languagePrimary, stateName }) {
  return `
你是资深前端工程师。任务：根据 instruction 生成一个“新增浮层/覆盖层”的 NEW HTML 片段。

state name: ${stateName}
${languageHint(languagePrimary)}

==================【输出格式（唯一允许）】==================
只输出如下结构，不要其它文字：
<!-- NEW_HTML_START -->
<这里是最终 NEW HTML 片段>
<!-- NEW_HTML_END -->

==================【硬约束】==================
- 只输出 NEW 片段，不要输出 [OLD]，不要解释。
- NEW 必须是可直接渲染的 HTML + 内联样式（必要时可含 <style>）。
- 浮层优先使用 fixed 定位并给出 z-index；避免被底层内容遮挡。
- 需要新卡片/新页面时，明确尺寸与位置（max-width/width/height/top/left/right/bottom）。
- 除非 instruction 明确要求，不要全屏遮黑，不要引入复杂动画。

${STABLE_ID_RULE}

==================【anchor（平台会在它之后插入 NEW）】==================
${Array.isArray(edit.anchor) ? JSON.stringify(edit.anchor) : edit.anchor}

==================【修改指示】==================
${edit.instruction}
`.trim();
}

module.exports = {
  buildSkill2Prompt,
};
