---
name: taskflow-implementation-plan
description: >
  任务流蓝图 Sub-skill 3：实现方案具体生成 Agent。
  为每个非 state_1 的 happy-path state 提供 2–3 个候选 UI 实现方式，供用户选择。
  对应 taskflowIntentSkill.js Phase 3。
---

# Sub-skill 3：实现方案具体生成 Agent

## 定位

蓝图生成第三步。对 Sub-skill 2 确认的状态清单中每个非 state_1 的 state，给出 2–3 个候选 UI 实现方式，让用户挑选。

## 输入

- `confirmed_states`：Sub-skill 2 用户确认保留的状态清单（含 `id / label / description / rationale`）
- `user_story`：Sub-skill 1 确认的 User Story
- `page_dsl`：页面 DSL（辅助判断设计语言/组件库）

## 输出

按 state 分组的候选实现方案，用户为每个 state 选定一种后，传入 Sub-skill 4。

每个候选必须输出 `implementation_plan`，不是 `label`。`implementation_plan` 是服务后续代码生成的具体实现说明，应写清楚组件、形式、布局、文案、继承关系和状态变化，而不是一句短标签。

候选实现方式必须参考 Phase 2 的 `description` 三段：

- `触发条件` 用于判断该 state 的主要用户意图
- `展示信息` 用于决定当前画面需要哪些组件、文案和布局
- `继承信息` 用于决定应保留哪些视觉骨架，以及候选方案中哪些内容是新增或变化的

## 核心规则

### Material Design 意图 → 组件映射参考

生成每个 state 的 2–3 个候选方案时，优先参考 Google Material Design / Material 3 的组件职责：候选方案应从用户意图反推组件，而不是先套固定页面模板。

### Material Design Intent-to-Implementation Rules

### Action Intent

- If the user needs to perform the primary page action, use a filled button or FAB.
- If the action is secondary, use an outlined button or text button.
- If the action is compact and placed in a toolbar, use an icon button.
- If the action reveals several choices, use a menu.
- If the action result is reversible and lightweight, use a snackbar with an action.

### Selection Intent

- If the user can select multiple independent options, use checkboxes.
- If the user must select exactly one option from a small set, use radio buttons.
- If the user turns a setting on or off and the change applies immediately, use a switch.
- If the user selects a numeric value from a range, use a slider.
- If the user switches between a small number of views or sort modes, use segmented buttons.
- If the user filters content, use filter chips.
- If the user enters compact tokens, use input chips.

### Text Input Intent

- If the user inputs a name, title, or short text, use a text field.
- If the user inputs long-form content, use a multiline text field.
- If the user searches product content, use a search bar or search view.
- If the user selects a date, use a date picker.
- If the user selects a time, use a time picker.

### Navigation Intent

- If the user switches between top-level views on a small screen, use a navigation bar.
- If the user switches between top-level views on a medium or large screen, use a navigation rail.
- If the app has many destinations or hierarchy, use a navigation drawer.
- If the screen needs title, back navigation, and actions, use a top app bar.
- If the user switches between sibling content sections, use tabs.

### Feedback Intent

- If the system provides short non-blocking feedback, use a snackbar.
- If the user must act on important information, use a dialog.
- If the system is processing, use a progress indicator.
- If the UI needs to show notification count or status, use a badge.
- If the user needs contextual help, use a tooltip.

### Containment Intent

- If the UI presents one subject with related actions, use a card.
- If the UI presents many similar items vertically, use a list.
- If the UI presents secondary content from the bottom, use a bottom sheet.
- If the UI needs subtle grouping, use a divider.

选择规则：

- 一个 state 的默认候选必须贴合该 state 的主要用户意图；例如“单选公司/个人属性”应明确 Radio buttons 或 Segmented buttons，而不是只写“表单页面”。
- Switch 只用于“开启/关闭且立即生效”的布尔设置；不要把 Switch 用于“公司/个人、类型 A/类型 B”这类语义分类二选一。
- 若是严格单选，不要使用会暗示多选或 token 输入的 Chips；只有“筛选标签 / 多选标签 / 已输入 token”场景才使用 Filter chips / Input chips。
- 若 state 同时包含多个意图，按视觉主次组合组件：页面容器（Full-screen page）+ 输入（Text field）+ 选择（Radio/Segmented buttons/Chips）+ 主按钮（Button）。
- 成功终态优先使用 Snackbar / Toast，除非 brief 明确要求进入成功页或展示完成详情。
- 提交中态优先描述 Button loading 或 Progress indicator；只有等待画面本身可见且重要时才单独作为 state。
- 候选方案中不要写“使用 Material 组件库实现”这类技术绑定；只描述组件形态、位置、文案和可见状态。

### 描述以稳定画面为主，允许必要动效说明

实现方案需要优先说明 state 的稳定画面：屏幕上有什么、在哪个区域、文案是什么、关键组件如何组织。

`implementation_plan` 必须包含以下信息：

- 组件：使用哪些可见组件或控件形态，例如全屏页、Top app bar、Text field、Radio buttons、Segmented buttons、List、Button、Snackbar、Progress indicator。
- 形式：组件呈现方式和状态，例如输入框为空/已填写、单选项选中态、按钮默认/禁用/loading、Toast/Snackbar 出现位置。
- 布局：组件位于页面哪个区域，以及从上到下/从内到外的排列关系。
- 文案：关键标题、按钮、提示、占位符、成功反馈等可见文本。
- 继承/变化：相对 Phase 2 `description.继承信息` 中提到的来源 state，哪些骨架保留，哪些区域替换或新增。

允许补充必要的动画/过渡过程描述，例如：

- "底部抽屉从下方滑入，最终停在屏幕底部 50vh，列出说明 + 两个按钮"
- "顶部 Toast 显示在状态栏下方 16px，短暂停留后淡出"
- "提交后按钮进入 loading 态，随后展示成功提示"

注意：动效只能作为补充，不得替代 state 的画面结构、字段文案和组件布局。

### 取消/关闭/返回类状态

蓝图默认只覆盖 happy-path，不主动为取消/关闭/返回单独建 state。若 brief 明确要求将取消/返回作为主路径一部分，可描述其最终画面和必要动效。

### 候选 ID 与分组格式

```json
{
  "id": "state_2::opt_a",
  "implementation_plan": "采用全屏表单页承载创建项目集流程。保留 state_1 的顶部状态栏，主体区域替换为创建项目集表单：顶部放置页面标题“创建项目集”和返回入口；中部从上到下排列项目集名称 Text field（占位符“请输入项目集名称”）、属性单选 Radio buttons（选项“公司”“个人”，默认未选或按业务默认选中）、添加项目 List/入口卡片（文案“添加项目”）；底部固定红色主按钮“确认”。该方案适合字段较多且需要清晰提交路径的状态。",
  "rationale": "适合需要承载较多字段或业务信息的主路径状态",
  "group": "state_2 · 示例状态",
  "default": true
}
```

- `id` 格式：`state_N::opt_a/b/c`
- `implementation_plan` 是候选实现方案正文，必须是可执行的 UI 实现描述，不得写成短标签
- `group` 格式：`state_N · {state_name}`
- 每组**第一个候选**（最推荐）标记 `default: true`
- 每个 state 给 **2–3 个候选**
- 候选文案必须贴合当前 `brief` 和 state 名称，禁止照抄示例里的"风险说明"、"下载"等无关业务词
- 禁止用 `label` 代替 `implementation_plan`

## LLM 输出协议

```json
{
  "action": "ask",
  "phase": 3,
  "questionText": "我给每个页面列了几种实现方式，你可以保留默认选择直接提交；想换方案就在对应分组里换一个。",
  "options": [ ... ],
  "multiSelect": true,
  "allowCustom": true,
  "note": "每个分组选一种即可；如需自定义可在补充栏写一句话描述。"
}
```

总 options 数 = Σ（每个非 state_1 的 state × 2–3 个候选）

## 约束

- 每条 rationale 一句话自然语言，说明适合场景或与其他候选的差异
- 每条 option 必须包含 `id / implementation_plan / rationale / group / default`
- `implementation_plan` 建议 80–180 字，必须包含组件、形式、布局和关键文案
- `implementation_plan` 不能只写“全屏页面：...”这类一句话摘要
- 禁止 state_1 出现在 options 中（初始态即原始页面，不改造）
- 输出严格 JSON，禁止 Markdown 包裹
