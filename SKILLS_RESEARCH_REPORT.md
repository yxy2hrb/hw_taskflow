# AI 驱动 UI 原型生成 · Skills 调研与融合进展报告

> 本报告中列出的每个外部 skill 均已通过 `gh api` 确认仓库真实存在，并读取其 `SKILL.md` / references 原文核实内容。下方「真实性」一列标注核实状态。

---

## 一、项目背景

**项目目标**：给定一张 D2C 导出的初始 HTML 页面 + 一段自然语言任务流描述，自动生成后续若干 state 的静态 HTML 原型，完整呈现一个用户操作流程（如"点击筛选 → 弹出面板 → 选择条件 → 确认 → 刷新列表"）。

**当前 Pipeline 架构**（已蒸馏为 `.cursor/skills/taskflow-llm-pagegen/`）：

```
原始 HTML + 操作描述
  ↓
[1] Preprocess      语义锚点提取（Playwright bbox + LLM 语义注释）
  ↓
[2] Blueprint       任务流蓝图生成（4 阶段 LLM：用户故事→状态枚举→实现规划→蓝图构建）
  ↓
[3] State Model     状态实现模型（LLM 输出每个 state 的 keep/create/update 意图）
  ↓
[4] Component CG    逐组件代码生成（每个 create/update 组件单独 LLM 调用）
  ↓
[5] Page Layer      完整 HTML/CSS state layer 组装（LLM + Playwright 截图验证）
  ↓
最终输出：Index.state-model.llm-layers.html（含所有 state，JS 可切换）
```

---

## 二、问题诊断

### 问题一：页面设计审美不足（平、闷、无焦点）

测试反馈：生成页面"规范性和好看方面差点意思"。具体表现：

- 页面元素**等权重**——卡片高度一致、文字颜色接近，视觉上"平、闷"
- 没有明确的**视觉主焦点**——用户无法一眼抓到该操作什么
- 间距不规律——AI 手写 inline style 出现 `padding: 13px 7px`、`margin: 5px` 等随机值

**根因**：缺少"刻意设计的层级与焦点"。**合规 ≠ 好看**——设计规范锁定的是"用什么组件、什么颜色"，没有锁定"执行质量"。同样的设计系统，好设计师和普通模型的差距在于是否有刻意的层级与焦点。

### 问题二：蒸馏导致的信息损失

原项目（legacy 路径，入口 `run_test.js` → `taskflowOneClick.js`）的核心设计规范，在蒸馏为新 skill 时大量丢失：

| 原项目位置 | 丢失内容 |
|---|---|
| `backend/src/taskflowPatch.js` 的 `HARMONY_PATCH_GUIDE`（第 414 行）| HarmonyOS 色板（9 token）、圆角系统（5 档）、字体规范、4px 间距体系、组件视觉契约、8 条美学红线 |
| `backend/src/prompts/hifiRenderPrompt.js` | 6 级字体层级、逐组件间距规范、anti-slop 禁令 |
| `detectLanguage()` | 页面语言自动检测（新 skill 丢失后导致中文页面被生成英文文本的 bug）|

这些**可执行的具体规则**被蒸馏为抽象描述，从约束退化为无操作意义的口号。

> 注：此问题的解法是**还原原项目自身规范**，不是引入外部 skill。

### 问题三：缺少交互过渡 / 动态效果

当前 skill 明确限制 "interaction flow is out of scope"，输出纯静态 HTML。后续若要做交互原型，需要：

1. State model 中的 `trigger` + `patches.bind` 数据**已具备**（交互意图已有）
2. 需新增 JS 运行时：读取 `__TF_STATE_MODEL__`，将 anchor 名映射到 DOM 元素，注册事件
3. 需新增过渡动画层（bottom sheet slide-up、overlay fade 等）

---

## 三、Skills 调研结论（已核实）

### 3.1 核实总表

| # | Skill / 来源 | 真实性 | 对应问题 | 借鉴方式 | 结论 |
|---|---|---|---|---|---|
| 1 | `LovroPodobnik/refactoring-ui-skill`（⭐24）| ✅ 读过 references 原文 | 问题一 审美 | 借设计判据，不抄代码（Tailwind 栈）| **采用** |
| 2 | `wondelai/skills` → `microinteractions`（子目录）| ✅ 读过 SKILL.md | 问题三 交互 | 借四件套结构框架 | **采用** |
| 3 | `199-biotechnologies/motion-dev-animations-skill`（⭐19）| ✅ 读过 SKILL.md | 问题三 动效 | 只借硬数值标准（输出 React，不抄码）| **采用** |
| 4 | `vercel-labs/agent-skills` → `web-design-guidelines`（子目录，规则源 `vercel-labs/web-interface-guidelines`）| ✅ 读过规则原文 | 通用质量校验 | 借确定性 lint 规则集 | **采用** |
| — | `freshtechbro/claudedesignskills`（⭐193）| ✅ 真实 | 问题三 | 21 个插件全是重型 React/3D/WebGL 库 | **不采用**（对 HTML+CSS 移动原型过重）|
| — | `op7418/guizang-ppt-skill`（⭐14087）| ✅ 真实 | — | 横向翻页 HTML 演示稿（slide deck）生成器 | **不采用**（与移动 UI 原型不搭）|
| — | UICrit（arXiv 2407.08850, UIST'24）| ✅ 论文真实 | 问题一 评分 | 学术论文 + 数据集，**非可安装 skill** | 仅借**方法论** |

### 3.2 已剔除的早期错误结论（留档以免重蹈）

- ~~Anthropic `frontend-design` 贡献"单焦点/内核 B"~~ —— **该 skill 实为"给每页注入大胆且多样的审美方向"，与本项目"锁定单一设计系统、跨页零差异"目标冲突，不引入。**"单焦点/弱化竞争项"的真实来源是 refactoring-ui。
- ~~归藏 PPT skill 提供"8pt grid / 奇数 px 禁令"~~ —— 它没有这套规则。
- ~~UICrit 是可安装 skill~~ —— 它是学术论文/数据集，只能借方法论。

---

## 四、采用的 Skills · 详细借鉴方案

### 4.1 `refactoring-ui-skill` —— 解决「审美」

**来源**：Adam Wathan & Steve Schoger《Refactoring UI》→ Claude skill。
**真实内容**（`references/` 5 个文件已读原文）：`hierarchy.md`、`typography.md`、`color.md`、`layout-spacing.md`、`depth-and-polish.md`。

| 借鉴的启发式（出自 hierarchy.md 原文）| 含义 | 注入位置 |
|---|---|---|
| **De-emphasize to Emphasize** | 主元素不突出时，减弱周围竞争项（去掉次级容器背景、非活跃项变灰），而非加重主体 | `page-layer/SKILL.md` |
| **字重 + 颜色建立层级** | primary 用 600/700 + 深色，secondary 用 400 + 灰，不靠字号大小区分 | `component-codegen/SKILL.md` |
| **Label:Value 反模式** | "12 left in stock" 优于 "In Stock: 12"；格式显而易见时直接去标签 | `state-implementation-model/SKILL.md` |
| **按钮靠视觉层级，非语义** | Delete 若非主操作就不要大红，只在确认弹窗里它是主操作时才红 | `component-codegen/SKILL.md` |

**注意**：该 skill 基于 Tailwind / 通用 Web 栈，**只借判断好坏的"眼力"启发式，代码不直接复用**。

### 4.2 `microinteractions`（wondelai/skills 子目录）—— 解决「交互意图」

**来源**：Dan Saffer《Microinteractions》→ Claude skill。
**真实内容**：四件套结构 **Trigger → Rules → Feedback → Loops & Modes**，配 0–10 评分法。硬数值：

- 反馈延迟 **< 100ms**（直接操作）
- 触发态必须视觉可辨：default / hover / active / disabled / loading
- 隐藏手势触发必须配可见的备选入口

**借鉴方式**：改造 `state-implementation-model/SKILL.md` 的 `trigger`/`patches` 描述——从"click 跳到 state_N"升级为带 Feedback、Loop 的完整交互意图结构。

> 同 repo 还含 `ios-hig-design`、`design-everyday-things`，后续可作 affordance / HIG 规范参考。

### 4.3 `motion-dev-animations-skill` —— 解决「动效质量标准」

**来源**：`199-biotechnologies/motion-dev-animations-skill`。
**核心价值**：把动效质量落成**可检验的硬数值**。

| 硬标准 | 数值 |
|---|---|
| 帧率 | ≥ 60fps |
| 触发属性 | 只用 `transform` / `opacity`，不触发 layout |
| 入场缓动 | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Stagger 间隔 | 0.1–0.2s |
| Spring | stiffness 300–400 / damping 20 |
| 无障碍 | 必须支持 `prefers-reduced-motion` |

**注意**：该 skill **输出 React / Motion.dev 代码**，本项目输出 HTML+CSS，**只借上述数值标准作为动效验收线，不复用代码**。注入 `page-layer/SKILL.md` 动效规则 + 质量评分维。

### 4.4 `web-design-guidelines`（Vercel）—— 解决「确定性质量校验」

**来源**：`vercel-labs/agent-skills` 的 `web-design-guidelines` skill，运行时拉取规则源 `vercel-labs/web-interface-guidelines/command.md`。
**真实内容**：成体系的确定性 lint 规则，可机器检查。摘录与本项目相关的：

- **Animation**：honor `prefers-reduced-motion`；只动 `transform`/`opacity`；禁 `transition: all`（显式列属性）；动画可中断
- **Typography**：用 `…` 不用 `...`；弯引号；数字列用 `font-variant-numeric: tabular-nums`；标题 `text-wrap: balance` 防孤字
- **Accessibility**：icon-only 按钮要 `aria-label`；动作用 `<button>` 不用 `<div onClick>`；异步更新要 `aria-live`
- **Content**：长文本要 `truncate`/`line-clamp`；处理空状态
- **Images**：`<img>` 要显式 `width`/`height` 防 CLS

**借鉴方式**：扩展 `taskflowQuality.js` 的确定性校验维度——从现有"故障检测"（溢出/泄漏/资源缺失）扩展到"UX 正确性检测"。

---

## 五、整体方案与优先级

### 5.1 两条主线

```
方向一：页面生成质量（问题一 + 问题二）
  ├── 还原原项目蒸馏丢失的规范（HARMONY_PATCH_GUIDE + hifiRenderPrompt.js）
  ├── 注入 refactoring-ui 的层级/焦点判据
  └── 注入 vercel guidelines 的确定性 lint
          ↓ 质量底座稳定后
方向二：静态 → 交互原型（问题三）
  ├── 架构转型：JS 运行时 + 过渡动画层
  ├── microinteractions 四件套结构化交互意图
  └── motion-dev 硬数值作为动效验收线
```

### 5.2 优先级

| 优先级 | 任务 | 来源 | 工作量 |
|---|---|---|---|
| **P0** | 还原原项目规范（字体层级 / 间距 / 美学红线 / 语言检测）注入三个 SKILL.md | 原项目 `taskflowPatch.js` + `hifiRenderPrompt.js` | 中 |
| **P0** | 注入 refactoring-ui 层级/焦点判据 | refactoring-ui-skill | 小 |
| **P1** | 扩展 `taskflowQuality.js` 确定性 lint | vercel web-interface-guidelines | 小 |
| **P1** | 视觉评分维度（美学打分可观测）| UICrit 方法论 | 中 |
| **P2** | 交互架构转型 + 四件套交互意图 | microinteractions | 中 |
| **P2** | 过渡动效 + 硬数值验收 | motion-dev | 中 |
