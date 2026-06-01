---
name: pixso-to-shadcn-react
description: >-
  Converts a Pixso node link (with item-id) into pixel-perfect React components
  for this repository's shadcn-style component library. Enforces Pixso as the
  single visual source of truth via DSL + screenshot verification; component
  props and values align with get_node_dsl. Maps to this repository root with
  existing Harmony conventions and Storybook outputs.
  Use when the user provides a pixso.cn node URL or asks for Pixso/Figma-to-code
  component implementation in this repo.
---

# Pixso 链接 → shadcn 风格 React 组件（本仓库工作流）

**执行身份（Role）：** 高级前端架构师 + UI 自动化专家。

用于将 **Pixso 节点链接** 转成本仓库可运行的 **shadcn 风格 React 组件**，并保持 1:1 视觉还原。

**最高原则（Priority #1）：** 还原度与样式 1:1 是第一优先级；组件抽象、代码风格与实现便捷性都不得牺牲设计还原精度。

## 核心目标（不可缺失）

1. 输入是带 `item-id` 的 Pixso 节点链接。
2. 以 Pixso 为唯一真值，用 **DSL + 截图** 双证据做 1:1 还原（重中之重）。
3. 在不降低还原度前提下，交付组件源码、类型、Storybook，且符合本仓库规范。
4. **Props 硬对齐：** 生成的 React **Props（名称、语义、默认值与合法取值集合）** 与同一节点 **`get_node_dsl`** 中可读的**组件属性、变体参数、实例覆盖**等保持一致；不得在无理由情况下增删、改名或改写 DSL 中的可取属性值（细则见「Props 与 `get_node_dsl` 硬对齐（组件 API）」）。

任一项缺失，不能宣称“完成还原”。

## 全局样式与组件样式优先级（`src/styles`）

与 **「Pixso 1:1 为最高原则」** 叠加使用，按下面顺序决策；**不得以统一全局为由削弱稿面可验证的还原度**。

1. **第一优先：Pixso 设计稿**  
   尺寸、间距、布局、色值、字阶、状态等以 **DSL + 截图** 为准；组件实现必须能对照稿面复核。

2. **第二优先：与稿面一致时，走 `src/styles`（以 `global.css` 为主）**  
   若 `global.css`（或 `src/styles/` 下其它生效样式）已有变量/约定，且与**当前组件从稿面还原出的语义与数值可对齐**（例如同一主色角色、同一圆角语义、同款表面/边框层级），则在组件中使用这些全局 Token / 语义类，与全库风格统一。**优先读 `global.css`**，再按需读同目录其余文件。

3. **`src/styles` 中尚无对应 Token**  
   在本轮实现中从稿面**归纳一组全局 Token**（命名与现有 `:root` / `.dark` 内 `--*` 保持一致性），**追加到 `src/styles/global.css`**（双色模式按现有结构补全）；组件内引用新变量而非仅在局部硬编码零散值。须在 **`src/components-specs/{id}.md`** 与交付说明中记录：**新增变量列表**、映射的 Pixso 取值、是否仅作用于本组件或可作为全库扩展。

**冲突处理：** 若使用现有全局变量会导致与稿面**可见差异**，则不得为了「省事」牺牲 1:1：或采用稿面专属的 **新 `--*` Token**（见上条），或在规格中写明与全局主题的偏差及原因。

## 执行优先级（MUST / SHOULD / MAY）

- **MUST**
  - 任何实现决策都必须服从 1:1 视觉还原；若与工程实现习惯冲突，优先保证还原度并记录取舍。
  - 节点链接必须带 `item-id`（不要只给文件首页）。
  - 同一节点必须拉取 `get_node_dsl` + `get_image`（或等效）。
  - **Props 与 `get_node_dsl` 硬对齐：** 组件对外 Props、默认值与 Storybook 中各变体/状态的 **`args` 取值**须与 **`get_node_dsl`** 中该节点属性及属性值一致；命名映射、Typescript 惯例与仅 DSL 不可用时的例外，按「Props 与 `get_node_dsl` 硬对齐（组件 API）」执行。
  - 对混合绝对定位/Flex 的节点，必须做父子 Bounding Box 相对坐标校验，按约束使用 `absolute` + `inset-*` 精确落位，禁止默认 `flex-1` 近似替代。
  - 文字样式必须提取并还原 `lineHeight` 与 `letterSpacing`；优先映射 Tailwind `leading-*` / `tracking-*`，无法精确映射时使用 arbitrary value（如 `leading-[22px]`、`tracking-[0.2px]`）。
  - 输出可运行组件与 `*.stories.tsx`，并遵守仓库目录/命名/Token 约束；样式须与 **`src/styles/global.css` 及 `src/styles/`** 按本节「三层优先级」对齐（可读的全局 `--*` / 语义类优先；缺则增补至 `global.css` 并记入规格）。
  - 每次新增或实现组件时，必须同步产出/更新 `src/components-specs/{component-id}.md` 规格文档（若无 `component-id`，可用 kebab-case 组件名），记录设计来源、量化参数、状态、Props 与取舍说明。
- **SHOULD**
  - 可用时运行 `design_to_code` 获取结构草案（仅作草案，不是最终真值）。
  - 优先复用 `src/components/**` 现有组件和样式变量。
  - 实现前阅读 `src/styles/global.css` 及 `src/styles/` 下其它样式文件；当稿面语义与全局已有 Token/工具类**一致或可等价映射**（色板角色、圆角档位、边框/背景语义等）时，**优先使用** `global.css` `--*` 变量与 Tailwind/shadcn 语义类，避免组件内堆积与全局脱节的魔法值。
  - 在 `src/components-specs` 增补组件映射与简短规格。
- **MAY**
  - 无法写入 Pixso 导出 CSS 时，可基于 DSL + 截图 + 现有变量手写等价样式，并在交付中说明。
  - **`src/styles` 无可用 Token**：从稿面 DSL/截图提炼一套**全局级**命名（与现有 `:root` / `.dark` 中 `--*` 命名风格一致），**写入 `src/styles/global.css`**（按需补 light/dark），组件内通过 `var(--…)` 或已配置的 Tailwind 扩展引用；在规格文档与交付中写明新增变量名、Pixso 取值、适用范围与是否影响全局主题。

## 任务类型分流（小增强）

先判断当前需求属于哪一类，再走对应路径：

- **组件级任务（默认）**
  - 目标是单个组件或节点切片。
  - 直接走本文件“快速工作流”6 步。
  - 重点关注：组件复用、样式精确还原、stories 覆盖。
- **页面级任务**
  - 目标是整页或多模块组合页面。
  - 在执行“快速工作流”前，先补充读取并遵循 `skills/shadcn/SKILL.md` 中的页面生成路径（如 `route-index`、`layout`、资源契约）。
  - 页面级仍必须满足本文件的 1:1 还原与交付约束，不可跳过 DSL+截图双证据。

## 快速工作流（按顺序执行）

1. **读取上下文**：先读 `skills/shadcn/SKILL.md`、**`src/styles/global.css` 与 `src/styles/`** 下其余样式、`src/components-specs/config.json`（拿到 `active` / `projectRoot`）。
2. **拉取设计真值**：用 Pixso MCP 获取同一节点的 DSL 与截图；如可用再调 `design_to_code`。
3. **先规格后编码**：先整理关键量化参数（尺寸、间距、圆角、色值、字体、状态）及 **`get_node_dsl` 中的组件属性/变体字段与取值**，**对照 `global.css` 已有 Token 决定复用或新增**，并先定稿 **Prop 表与 DSL 对齐关系**，再写 TSX/CSS。
4. **映射仓库模型**：优先复用 `src/components/**`；新组件按现有目录结构放置（同目录 `*.css`、`*.stories.tsx`，可选 `index.ts`）。
5. **实现与校验**：在 `projectRoot` 实现并运行 `node skills/scripts/validate_design_system_resources.mjs`、`npm run build`（必要时 `npm run build-storybook`）。
  - 若环境允许，执行视觉回归：用 `skills/pixso-to-shadcn-react/scripts/capture_storybook.js` 截取 Storybook 组件图，并与 `get_image` 真值图做像素级或 SSIM 对比。
   - 差异阈值默认 `<= 5%`；超过阈值必须继续调样式并复测，直到达标或明确记录阻塞原因。
6. **交付说明**：给出 Pixso 链接与 `item-id`、MCP 调用清单、1:1 对照结论、fallback 依据、改动文件和 Storybook 入口；并明确对应 `src/components-specs/*.md` 已创建或已更新。

## 组件规格文档约束（`src/components-specs/*.md`）

- 触发条件：本次任务只要涉及“新增组件”或“重做已有组件”，都必须创建或更新对应规格文档。
- 文件命名：优先使用 `src/components-specs/components.json` 中的 `id`，文件名为 `{id}.md`；若找不到映射，使用组件名 kebab-case。
- 最低内容（不可缺失）：
  - Metadata：实现目录、stories 路径、Pixso 链接与 `item-id`、MCP 工具来源。
  - 组成与用途：导出项、使用场景。
  - 量化规格：尺寸/间距/圆角/字体/色值/关键坐标或约束。
  - 状态与交互：default/hover/active/disabled/focus（按组件适用范围）。
  - Props：核心类型签名与默认值；**须附「DSL ↔ Prop」对照**（DSL 字段路径或键名 → Prop 名、可取值的集合是否与 DSL 一致）；若仅存命名惯例差异（如 camelCase），也不得改变语义或枚举范围。
  - 样式引用：列出使用的 **`global.css` / `src/styles`** 变量与类；若有**新增写入 `global.css` 的全局 Token**，必须单列名称、取值来源（Pixso）、`:root`/`.dark` 是否均已覆盖。
  - 取舍说明：与 DSL/截图存在偏差时的原因与影响。
- 已有文件更新策略：
  - 若文件已存在，优先增量更新，不要覆盖人工补充内容。
  - 新增内容应追加到对应章节或补齐缺失章节。

## 1:1 还原硬约束

- 凡可量化项（布局、间距、圆角、尺寸、色值、字号/字重/行高、层级）必须落地到 px 或已映射 Token。
- 当 DSL 同时出现绝对定位与 Flex 语义时，先计算子元素相对父容器的包围盒（Bounding Box）与约束，再决定布局方案。
- 涉及可动部件（滑块/旋钮/游标/页签/选中态）必须核对：几何中心、轨道边距、激活层与把手覆盖关系，禁止只靠百分比估算。
- DSL 与截图或标注冲突时，优先可复现稿面与约束语义，并在交付中记录取舍。
- 有多子类型/多状态时，逐类型对齐，不得“还原一种推全局”。

## Props 与 `get_node_dsl` 硬对齐（组件 API）

- **真值**：以同一节点的 **`get_node_dsl`** 返回结构为准，校对**组件属性、变体（variant）、实例参数**等与「对外可配置维度」相当的字段。
- **须一致**：React 组件的 **Prop 列表、默认值、字面量枚举/联合类型允许的取值**，以及 Stories 中 **`args` / controls** 用于展示各态的赋值，均可回溯到 DSL 中的同名或已映射字段与取值；禁止引入 DSL 中**不存在**的 Props，禁止**缩小或篡改** DSL 已给出的可取属性值集合。若需封装进既有仓库组件导致 API 合并，须在规格中**逐项**给出 **DSL 字段与取值 ↔ 最终实现** 的证明：**任一 DSL 中存在的可配置取值仍可通过 Props（或文档化的组合用法）表达出来**，不得静默省略稿面维度。
- **命名映射**：若仅因 TypeScript / React 惯例需调整标识符（如 camelCase），须在 **`src/components-specs/*.md`** 中用表格写明 **DSL 属性路径或键 ↔ Prop 名**；映射不得改变语义与合法取值集合。
- **不可用 `get_node_dsl` 时**：依「MCP 故障矩阵与降级顺序」取得的等价结构化信息视同 DSL；若仅能依赖截图与手工量化表而无属性字段，须在规格与交付中**逐项列出暂未与 DSL 硬对齐的 Props** 及原因，并在取得 DSL 后回补修订。

## Typography 深度校准

- 必须从 DSL 提取：`fontSize`、`fontWeight`、`lineHeight`、`letterSpacing`，并逐项落地实现。
- `lineHeight` 优先映射 `leading-*`，无法精确对应时使用 `leading-[value]`。
- `letterSpacing` 优先映射 `tracking-*`，无法精确对应时使用 `tracking-[value]`。
- 默认 shadcn 文本样式不能直接视为设计真值，必须经过字体参数校准后再交付。

## Storybook 约束

- 每个组件必须提供 `*.stories.tsx`，覆盖基础用法 + 多变体 + 多状态。
- 画布预览尽量复用现有 Story 包层风格（如 `Card` / `Slider`）。
- 整页背景保持仓库一致（`bg-[#f3f4f6]`），不要随意改成渐变或其他底色。

## 失败与降级处理

1. 无 `item-id`：停止实现，先向用户索要节点链接。
2. 无权限或 Token 失效：先修复权限，不用猜测样式替代。
3. `design_to_code` 或导出 CSS 失败：不阻塞，按 DSL + 截图 + 现有组件变量手工还原并注明 fallback。
4. 视觉回归脚本或依赖不可用：改为手工对照截图并在交付中注明“未执行自动 SSIM，对照方式为人工复核 + 关键尺寸复算”。

## MCP 故障矩阵与降级顺序

架构前提：Cursor 连的是 **Pixso 桌面端** 暴露的 `http://127.0.0.1:3667/mcp`；工具失败往往是 **Pixso 插件侧解析/渲染/批次缓存** 问题，不一定是 MCP 配置错误。

### 故障矩阵（现象 → 可能原因 → 处理）

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| `get_node_dsl`：`Cannot read properties of undefined (reading 'length')` | 当前文档图里解析不到该节点；**组件集根/占位**；插件内部字段为空 | 改选**画布上的实例**或**具体变体帧**；换同组兄弟 `node_id`（可用 `get_all_components` 反查） |
| `get_node_dsl`：`Index out of bounds`（传完整 URL 时多见） | URL 解析或索引越界；id 指向集合/非叶子 | 改用纯 `item-id`；或从画布复制**实例**链接再试 |
| `get_image` / `get_export_image`：`fetch failed` | 渲染超时、节点过大、Pixso 短暂无响应 | 缩小导出范围、重选节点、重启 Pixso 后重连 MCP；可改用 `get_export_image` 与 `get_image` 互换试 |
| `design_to_code` 成功，但 `localhost:3667/code/*.css`：`Invalid batch timestamp` | 设计端**批次缓存过期**（有缓存上限） | **同一轮对话内立刻**拉取 manifest 资源；拉不到则按 DSL/截图 + 仓库变量手写 CSS，交付注明 |
| `get_all_components` 能列出 id，但 `get_node_dsl` 仍失败 | 该 id 对 **DSL 导出路径** 不稳定（类型或内部结构） | 走 `design_to_code` + `get_image`；或用 `src/components-specs` 已落地的量化规格作辅证 |

### 降级顺序（拉取设计真值，严格按序尝试）

1. **前置**：目标文件在 Pixso 中已打开；尽量选中 **Frame / INSTANCE / 某一变体主件**，避免只依赖「组件集根」id。  
2. **`get_node_dsl`**（`itemId` 用 `3252:489` 这类纯 id，必要时再试完整 URL）。  
3. **失败** → 调 **`get_all_components`**，在同一 `file_key` 下找相邻变体 id，回到步骤 2。  
4. **仍失败** → **`design_to_code`**；若返回 manifest，**立即**下载 CSS/资源（同会话）；若 `Invalid batch timestamp`，跳过导出 CSS，不阻塞。  
5. **并行必做**：**`get_image` 或 `get_export_image`** 取真值图，用于 1:1 对照（与 DSL 或 codegen 结构交叉验证）。  
6. **仍缺结构化数据** → 使用 **`src/components-specs` 规格** + **仓库内同类组件**（几何/Token）+ 截图手工量化表；交付中写明 **fallback 依据**，不得宣称“仅有主观对齐”。

> Pixso 官方 workflow 建议：目标框架在支持列表内时 **优先 `design_to_code`**，并**立即**拉取清单资源；`get_node_dsl` 作为降级路径（见 MCP 资源 `pixso://guides/design-to-code-workflow`）。本仓库仍以 **1:1 还原** 为准：`design_to_code` 仅作结构草案，最终以 DSL+截图与稿面一致为准。

## Definition of Done

- [ ] 输入链接包含 `item-id`。
- [ ] 已使用同一节点 DSL 与截图做实现和复核；若 `get_node_dsl` 不可用，已按「MCP 故障矩阵与降级顺序」完成等价真值采集并在交付中写明依据。
- [ ] 关键视觉参数可追溯到设计真值。
- [ ] Props、默认值与各 Story **`args`** 已与 **`get_node_dsl`**（或已声明的降级等价结构化信息）对齐；规格中含 **DSL ↔ Prop** 对照表（若有命名映射须一并写明）。
- [ ] 混合定位节点已完成 Bounding Box 相对坐标校验，未用 `flex-1` 粗略替代精确落位。
- [ ] Typography 已校准（至少覆盖 `lineHeight` 与 `letterSpacing`）。
- [ ] 交付含源码、类型、`*.stories.tsx`，可在项目运行。
- [ ] 对应 `src/components-specs/{component-id}.md` 已创建或更新，且包含最小必需章节。
- [ ] 已完成资源校验与构建检查。
- [ ] 若环境允许，已完成 Storybook vs Pixso 真值图的视觉回归（阈值 `<= 5%`）；否则已记录降级原因与人工复核依据。
- [ ] 交付说明完整（链接、工具、对照结论、取舍、fallback）。

## 反模式（禁止）

- 不做 DSL 或不做截图对照就宣称 1:1。
- 把 `design_to_code` 结果直接当最终实现。
- **Props / Story `args` 与 `get_node_dsl` 中的属性名或可取属性值不一致**，却未在规格中提供 **DSL ↔ Prop** 对照或未说明合法例外（如 DSL 暂不可得）。
- 忽略 `src/components-specs` 与现有 Harmony 组件体系，另起一套硬编码样式。
- Storybook 不加预览包层，或随意更改整页背景风格。

## 参考资料

- Pixso MCP 配置：`docs/01-MCP准备.md`
- 设计输入到资源层：`docs/02-从设计输入到资源层的完整路径.md`
- shadcn 与资源契约：`skills/shadcn/SKILL.md`、`skills/shadcn/references/page-generation.md`、`skills/shadcn/references/resource-contract.md`
- 资源校验脚本：`skills/scripts/validate_design_system_resources.mjs`

## 附录：给用户的精简需求模板

```text
请基于这个 Pixso 节点链接（必须含 item-id）实现本仓库的 shadcn 风格 React 组件，要求 1:1 还原。

必须：
1) 用 MCP 拉取同一节点的 DSL 和截图（get_node_dsl + get_image 或等效）；
2) 先输出关键量化规格（尺寸/间距/圆角/色值/字体/状态）以及 **DSL 中的组件属性/变体字段与取值**，并对照 global.css决定复用全局 Token或新增 Token；**生成的 Props 与 defaults、Stories 中 args 须与上述 DSL 属性及取值一致**（仅惯例化名需在规格中映射表写明）；
3) 交付可运行源码 + TypeScript 类型 + stories；
4) Storybook 画布风格与仓库一致（含 bg-[#f3f4f6]）；
5) 回复里写明链接与 item-id、MCP 调用、对照结论、fallback 依据。

Pixso 链接：<替换为带 item-id 的完整 URL>
```
