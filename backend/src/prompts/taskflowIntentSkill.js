/**
 * ==========================================================
 *  任务流一键生成 · 第一阶段 Skill：3 轮对话澄清用户意图
 *  产出 taskflow.json 结构（驱动第二阶段增量打补丁生成）：
 *    [
 *      { state_id:1, state_name:"...", description:"...",
 *        implementation_method:"...", last_state:null },
 *      { state_id:2, ..., last_state:1 },
 *      ...
 *    ]
 *  风格：
 *    - 语言轻量、贴近产品沟通，不暴露任何评测指标术语；
 *    - 不再谈论 cost / recall / IoU / pattern 等；
 *    - 第三轮对每个 state 给出 2~3 个候选"实现方式"让用户挑；
 *    - 骨架一致性由生成阶段自行判断，不再询问用户。
 * ==========================================================
 */

/** 第一阶段 Skill 总系统提示词：引导 LLM 作为「任务流设计伙伴」。 */
const TASKFLOW_INTENT_SYSTEM_PROMPT = `
你是「任务流设计伙伴」。用户交给你一份设计稿（初始 HTML + 图）和一句任务流描述，
你要通过 3 轮轻量对话，帮他把这个任务流的页面清单、每一页的状态说明、以及每一页的实现方式，澄清成一份可直接驱动代码生成的结构化计划。

## 对齐目标（不要在对用户说话时提这些术语）
- 把「用户要做的事」分解为若干页面/状态；
- 每个状态都要能被清晰描述（发生了什么 + 界面上看起来是怎样）；
- 对每个状态，给出 2~3 个可行的 UI 实现方式作为候选。

## 输出协议
- 当你需要提问时，必须返回严格 JSON：
  {
    "action": "ask",
    "phase": 1 | 2 | 3,
    "questionText": "一句话问句（自然口语，不要出现"召回"、"Cost"、"IoU"、"评测"等术语）",
    "options": [
      { "id": "opt_xx", "label": "…", "rationale": "(可选) 自然语言解释，不出现评分数字", "group": "(可选) 当一个问题里同时列多个 state 的候选时用 group 分组，值形如 state_2 · 流量风险" }
    ],
    "multiSelect": true|false,
    "allowCustom": true,
    "note": "简短提示；可写"默认已推荐，直接确认即可"等"
  }
- 当你判断 3 轮都结束，可以产出最终蓝图时，返回：
  { "action": "done", "blueprint": { "states": [...], "meta": {...} } }
- 禁止 Markdown、禁止 <think>、禁止自然语言解释包裹 JSON。
`.trim();

/** 基础上下文：把用户输入 + 上一轮对话拼到当前 user prompt。 */
function buildConversationContext({ seedHtml, seedImageHint, seedBrief, qaHistory = [] }) {
  const htmlSnippet = (() => {
    if (!seedHtml) return "（用户未提供 HTML）";
    if (seedHtml.length <= 6000) return seedHtml;
    return seedHtml.slice(0, 3000) + "\n… [HTML 过长已截断] …\n" + seedHtml.slice(-3000);
  })();

  const history = qaHistory
    .map((qa, i) => `【Q${i + 1}|phase${qa.phase || "?"}】${qa.questionText}\n【A${i + 1}】${qa.answerText}`)
    .join("\n\n");

  return `
========【用户提供的初始信息】========
① 任务流简要说明：
${seedBrief || "（未提供）"}

② 初始图：${seedImageHint || "无"}

③ 初始 HTML（设计稿导出，可能已包含中文语义注释）：
\`\`\`html
${htmlSnippet}
\`\`\`

========【已有对话历史】========
${history || "（尚无对话）"}
  `.trim();
}

/** Phase 1：结构化 User Story 澄清（Actor / Trigger / Goal / Success 四维度） */
const PHASE1_INSTRUCTION = `
## 当前阶段 1/3：对齐任务流的 User Story

任务：先判断画布是手机端（360px）还是桌面端（1920px），作为背景默默记下。
然后按 User Story 的四个正交维度，**每个维度列 2~4 个候选**，让用户逐项勾选。
这样可以把用户的一句话简述反推成一份严谨的意图说明：

   "作为 <Actor>，当 <Trigger> 时，我希望能 <Goal / Happy Path>，直到 <Success Criteria> 为止。"

四个维度分别是（请用 group 字段严格使用下列文字作为分组名）：

1. group="① Actor · 主角" —— 谁在使用这个任务流
   候选例：已登录的普通视频观众 / 首次访问的游客 / 内容创作者本人 / 企业协作者
   2~4 条，**每条 6~14 字，精准可区分**；rationale 一句话解释典型特征（如"有未同步数据的老用户"）。

2. group="② Trigger · 触发点" —— 任务流从哪里、由什么操作进入
   候选例：在视频详情页点击下载按钮 / 在列表卡片上长按后选择"保存" / 分享链接落地后自动进入
   2~4 条；rationale 说明此入口的前置条件（如"必须处于登录态且视频未下载"）。

3. group="③ Goal & Happy Path · 核心目标与理想路径" —— 用户想完成什么，一路顺利的流转步骤
   候选用**三段式**写：<主要诉求> → <系统关键决策> → <用户确认/完成动作>。
   例："把视频保存到本地 → 系统识别蜂窝网络并提示风险 → 用户确认后等待下载完成"。
   2~4 条；rationale 一句话对比它和其它候选的差别（不提评分/cost）。

4. group="④ Success Criteria · 成功判定" —— 如何判断任务流走成功了
   必须从「端点状态」描述，不要只写"成功了"。
   候选例："本地相册出现对应文件且提示已保存" / "原下载按钮变为'已下载'状态且文件可离线播放" / "界面仅弹出成功 Toast，无实体文件落地"。
   2~3 条；rationale 说明该判定涵盖/忽略的边界情况。

## 输出要求
- 返回一个 JSON（action=ask, phase=1, multiSelect=true, allowCustom=true）；
- 在 options 列表中**按维度分组**给出全部候选，用 \`group\` 字段区分；
- questionText 固定写成："请从下面四个维度各选一项最贴近你意图的描述，我会把它们拼成完整的 User Story。"
- note 写："四个维度各选一项，也可以在补充栏写'Actor: xxx; Trigger: xxx;' 形式覆盖。"
- 每个 group 里把你认为**最贴近用户简述的那一条**标记 \`default: true\`。
- 禁止出现 cost / 评分 / 召回 / 逻辑合理性 / evaluation 等术语。
`.trim();

/** Phase 2：状态节点清单 */
const PHASE2_INSTRUCTION = `
## 当前阶段 2/3：列出这个任务流会涉及的页面/状态

任务：
A. 基于 Phase 1 的目标，列出任务流会经过的**所有页面/状态**。严格要求：
   1. 一定要从"初始态"开始；
   2. 如果流程涉及风险/确认（如流量警告、权限请求），要包含"风险提示"；
   3. 至少要有一个"进行中"的过渡态（如加载、进度）；
   4. 至少要有一个"成功"的终态；
   5. **主动列 1~2 个常见失败/冲突/取消终态**，不要只写 happy path。
   6. **导航完整性**：如果用户简述里出现"在 A 页点击 X 按钮**进入** B 页"、"**跳转到** Y 页面"、"返回 / 退回 N 页"等导航语句，
      A 来源页和 B/Y 目标页必须各开 1 个 state；中间过渡页（如"目标页初始态"）也是必备 state。
      ⚠️ 禁止把 A → B → C 这种"3 个独立 UI 状态"折叠成"A 直接出现 C 的弹窗 / 内容"，那会让生成结果直接缺中间页。
      示例：brief="在工作台点击'管理应用'进入管理应用页，再点击新增弹窗" → 必须列出 ① 工作台初始态 ② 管理应用页（列表） ③ 新增弹窗 三个 state，**不能把 ② 跳过**。

B. 每个候选 state 给：
   - id：固定 state_1 / state_2 / …（后续 Phase 3 要引用）
   - label：state 的"名字 · 一句话描述"，约 15~30 字
   - rationale（可选）：为什么这个状态值得单独开一页（一句话，口语化）

C. 这里要把候选 state 按**时间先后**排好顺序，state_1 一定是初始态。

note 里写："默认全部勾选即可；如果觉得某个状态没必要，取消它；如需补充其它状态请在补充栏写。"

返回 JSON（action=ask, phase=2, multiSelect=true）。options ≥ 4 条。
`.trim();

/** Phase 3：每个 state 的实现方式候选（分组，每组多选一） */
const PHASE3_INSTRUCTION = `
## 当前阶段 3/3：为每个页面挑一种"实现方式"

任务：对 Phase 2 里用户保留的每个 state（初始态 state_1 除外；初始态就是原 HTML 本身，不需要改造），
**为它给出 2~3 个候选的 UI 实现方式**，让用户挑一种。

重点要求：
1. **不要出现数字评分**，也不要说"推荐分 / Cost / 矩阵 / 召回率"这类词。
2. label 必须是一句话的自然语言**实现方式描述**——**且必须描写"静态最终视觉"，禁止动画/过渡/延迟语义**。
   - ✅ "底部上滑半屏抽屉：列出风险说明 + 两个按钮"（描述抽屉**已上滑到位**的最终视觉）
   - ✅ "顶部黄色横条：可展开看详情"（描述横条**已展开**的最终视觉）
   - ✅ "全屏模态弹窗：居中卡片，主按钮在右"（描述弹窗**已弹出**后的最终视觉）
   - ❌ "底部抽屉从下往上滑入 0.3s"（动画过程）
   - ❌ "右侧面板缓动滑出后消失"（动画过程 + 延迟）
   - ❌ "Toast 显示 2s 后淡出"（延迟）
   - ❌ "骨架屏闪烁加载 1s"（延迟动画）
   📌 后续生成的是**静态截图快照**，没有 JS 运行，描述任何"动画过程 / 等待时间 / 进入退出动画"都会让 LLM 把元素画在屏幕外或透明掉，截图直接翻车。
3. rationale 写一句话**自然语言解释**为什么适合这个场景，或它跟其它候选相比的差别，
   不要提评测指标，比如："更轻量，不打断当前页；但用户容易忽略"是可以的。
4. 每个候选的 id 形如 \`state_2::opt_a\`、\`state_2::opt_b\`；group 字段固定写 \`state_2 · {state_name}\`，
   以便前端把同一 state 的候选分到同一组。
5. 默认给**第一个候选**（最推荐的那个）打上 \`"default": true\`，让前端可以预选。
6. **"取消 / 关闭 / 返回 / 恢复初始"类 state 的候选必须明确写"画面与初始态一致，无叠加"**——
   不要给这类 state 写"以缓动滑出 / 淡出 / 0.3s 收起"这种**动画过程**作为实现方式。
   示例正确写法（以"取消筛选态"为例）：
     - "面板与遮罩均已关闭，画面回到初始列表视觉，无任何残留浮层"
   示例错误写法：
     - ❌ "面板向右缓动滑出 0.3s，遮罩淡出 0.3s"

note 里写："我给每个页面列了几种实现方式，你可以保留默认选择直接提交；想换方案就在对应分组里换一个，或者在补充栏里写一句话描述你想要的实现。"

返回 JSON（action=ask, phase=3, multiSelect=true, allowCustom=true）。
options 条目数 = Σ(每个非 state_1 的 state × 2~3 个候选)。
`.trim();

/** Phase 4 = done：产出 taskflow.json 格式的最终蓝图 */
const PHASE5_INSTRUCTION = `
## 3 轮已结束 —— 请直接产出最终蓝图（action=done）

骨架一致性（状态栏 / 导航栏 / 底部 Tab / 主色 / 字体）由你自己在生成阶段判断，**不要再询问用户**。

最终 blueprint 必须严格遵循以下 Schema（对齐 taskflow.json 约定）：

{
  "meta": {
    "title": "任务流标题（8–14 字，自然口语）",
    "slug": "url-safe-ascii-slug（小写连字符，如 mobile-video-download-flow）",
    "user_story": "一句话描述这个任务流（来自 Phase 1 用户确认）",
    "platform": "mobile" | "desktop"
  },
  "states": [
    {
      "state_id": 1,
      "state_name": "详情页初始/待下载状态（10~18 字，短标签，不要夹带整段描述；禁止出现 · 或冒号后接大段文字）",
      "description": "用户此时正在做什么 + 页面此刻呈现了什么（35~80 字）。要明确点出关键 UI 元素与位置（例如：操作栏右上角的下载按钮、顶部状态栏 4G 图标、页面中部视频缩略图）。",
      "implementation_method": "state_1 固定写'原始 HTML 初始快照，不做改造'。",
      "last_state": null
    },
    {
      "state_id": 2,
      "state_name": "流量下载风险提示状态（短标签）",
      "description": "触发原因 + 当前屏幕上可见的内容与具体文案（40~100 字）。",
      "implementation_method": "控件类型中文名 (英文对应名)：具体视觉结构 + 每条文本内容（中英文都给出）+ 按钮文案与数量 + 位置/层级。",
      "last_state": 1
    },
    ...
  ]
}

## 对 state_name / description / implementation_method 的细节硬要求

**必须比下面这份参考样例更具体、更详细**。参考样例：
  {
    "state_id": 2,
    "state_name": "流量下载风险提示状态",
    "description": "用户点击下载后，系统检测到使用移动数据网络，弹出确认框询问是否继续。",
    "implementation_method": "模态弹窗 (Modal/Dialog)：显示文本 'You are downloading using the mobile network. Continue?'，提供 'CANCEL' 和 'CONTINUE' 按钮。"
  }

你输出时必须做到：
1. **state_name** 是**短标签（10~18 字）**，不要夹"·"后面跟长描述。若 Phase 2 里用户的选项里混了长描述，你要**重新提炼成干净的短标签**。
2. **description** 要比参考样例**更详细**，且**必须是纯静态最终视觉描述**：
   - ✅ 只描述：屏幕上**此刻**有什么、在哪个位置、长什么样（颜色/字号/图标/排版）；
   - ✅ 点名**关键元素与位置**（如"顶部状态栏 4G 标识保持不变"、"页面底部浮出半屏抽屉"、"操作栏右上角的下载按钮"）；
   - ✅ 字数 35~100 字；
   - ❌ **严禁时序叙事**：禁止使用"用户点击 X 后…"、"…消失"、"…弹出"、"…淡出"、"接着 / 然后 / 之后"、"从 A 变为 B"、"刷新前的瞬间"等任何描述**画面变化过程**的话。
   - ❌ 严禁引用"上一态"的元素来说"…消失 / 关闭 / 移除"——下游拿到的 base HTML **只来自 last_state**，不是上一时序态。
   - ✅ 正确写法：把"X 消失"改成"画面里**没有** X"（或干脆不提 X）；把"用户点击确认后弹出"改成"屏幕中央**已显示**...弹窗"。

   ⚠️ 反例：
     ❌ "用户点击'确认'后，筛选面板与遮罩层**立即消失**，列表区域整体置灰，中央悬浮 spinner。"
        （时序词"点击…后""消失"会让下游拿 base=last_state HTML 去找根本不存在的"筛选面板"做删除，截图大块空白）
   ✅ 改写：
     ✅ "列表区域整体置灰（opacity:0.4），中央悬浮 32px 圆环 spinner，顶部状态栏与底部 Tab 正常可见，无遮罩与浮层。"
3. **implementation_method** 要比参考样例**更详细**，且**严格基于 last_state 这张画面起算**：
   - 先给**控件中文名 (英文类型)**，例如 "模态弹窗 (Modal/Dialog)"、"轻量级提示 (Toast/Snackbar)"、"按钮控件 (Button)"、"进度条 (Progress Bar)"、"底部抽屉 (Bottom Sheet)"；
   - 然后冒号后列出具体视觉结构（颜色/图标/布局）；
   - **必须给出具体文案**（中英文都给出，用引号引起来），例如：标题 'Friendly Reminder'、按钮 'CANCEL'/'CONTINUE'；
   - 若有多个元素，用分号或编号分隔；
   - 不提评测术语、不写 cost。

   ✅ **通用三段式硬约束（每个非 state_1 必须遵守）**：
   implementation_method 必须按下面结构组织，并且显式写出这三段（缺一不可）：
   - 基于 last_state=state_X（或 last_state 对应的 state_name）
   - 保留：哪些骨架元素保持不变（如状态栏、导航栏、底部 Tab、主容器）
   - 删除：哪些上一个状态里的临时层/遮罩/弹窗/提示需要移除（若无可删，写"无"）
   - 新增：当前状态新增或替换的 UI 结构与文案

   推荐模板（可同义改写，但语义必须完整）：
   "基于 last_state=state_X：保留A/B/C；删除D/E；新增F/G/H。"

   示例（通用，不限某个场景）：
   "基于 last_state=state_2：保留顶部状态栏与底部 Tab；删除上一态的临时弹窗与半透明遮罩；新增全屏详情主内容（标题'项目详情'、三张统计卡、操作按钮'返回'/'保存'）。"

   ⚠️ **base 基线硬约束**：下游 patcher 拿到的 base HTML **只来自 last_state**（不是任何"上一时序态"），所以：
   - 只能描述"在 last_state 这张画面上**叠加什么** / **改什么文字** / **改什么属性**"；
   - 禁止描述"删除一个 last_state 上根本不存在的元素"（例如 last_state=1 时禁止说"删除筛选面板"——state_1 上压根没有筛选面板）；
   - 如果你想说的"删除 / 关闭"目标实际上等于 last_state 的初始画面（即"什么都不该改"），就直接写
     "**画面与 last_state（state_X）完全一致；base 已是关闭后的样子，无需任何 DOM 改造**"。

## ⚠️ implementation_method 静态硬约束（重点！防止下游把动画当 DOM 删除）

下游生成的是**静态截图快照**——没有 JavaScript、没有 transition 触发器、没有时间流逝。
所以 implementation_method **必须是"画面已经渲染到位的最终视觉"描述**，禁止包含以下任何"动画/过渡/延迟/中间帧"语义：

❌ 严禁出现以下词汇 / 表述：
  - 动画 / 缓动 / 弹性 / Slide-in / Slide-out / Fade-in / Fade-out / 渐入 / 渐出 / 淡入 / 淡出 / 弹出动画 / 收起动画
  - transition / animation / ease-out / ease-in / 0.3s / 0.5s / "X 毫秒后"
  - "滑入后" / "滑出后" / "动画结束即移除 DOM" / "动画结束后 display:none"
  - "X 秒后自动消失" / "等待 N 秒"（Toast 写显示中的样子，不写"消失过程"）
  - "骨架屏闪烁加载" / "脉动" / "旋转动画 1s linear"（用静态 spinner 视觉描述即可，不写 1s linear）

✅ 正确做法：写"动画结束后的稳定画面"：
  - 不写"面板从右滑入 0.3s"，改写"面板停在屏幕右侧 70vw 宽，左侧 30vw 为半透明遮罩"
  - 不写"Toast 显示 2s 后淡出"，改写"Toast 显示在顶部状态栏下方 16px，白底圆角，含勾选图标 + 文案"
  - 不写"骨架屏闪烁加载"，改写"骨架屏：三条灰色横条（高 16px、深灰 rgba(0,0,0,0.08)）"
  - 不写"面板缓动滑出 0.3s 后消失"，改写"画面与初始态完全一致，无任何叠加/浮层"

✅ 取消 / 关闭 / 返回 / 恢复初始类 state 的 implementation_method **固定写法**：
  "**基于 last_state=state_X：保留原画面全部骨架；删除无；新增无（画面与 last_state 完全一致）**。"
  （示例 state_5 取消筛选态，last_state=1：应写"画面与初始态 state_1 完全一致；base 已是关闭后的样子，无需任何 DOM 改造。"——禁止写"面板向右缓动滑出 0.3s 后 display:none"这种动画描述！）

✅ 加载 / 过渡 / 等待中类 state（state_name 含"中…"、"过渡"、"loading"等）：
  写"画面已经进入 loading 状态的稳定视觉"，例如：
  "半透明黑色遮罩 rgba(0,0,0,0.4) 覆盖列表区，中央显示 32px 圆环 spinner（深灰 stroke #191919 + 浅灰底，CSS 旋转动画允许使用 \`animation:hmspin 1s linear infinite\` 表达视觉效果，但禁止写'1s 后消失'之类的时间过期语义）。"

## 硬约束
- **state 完整性**：最终 blueprint 的 states 列表**必须与用户在 Phase 2 picked 的 state 一一对应**，按 picked 顺序输出，**禁止合并 / 省略 / 重命名**任何 picked state。
  - 例：Phase 2 picked = [工作台首页, 管理应用页, 弹窗, 加载中, 成功, 取消, 失败] → 最终 blueprint 必须给出 7 个 state，含工作台首页和管理应用页两个独立 state（即使你觉得"工作台只是入口、合并到管理应用页更简洁"也不能合并——这是"导航完整性"硬约束）；
  - 仅允许：把 picked state 的 label 提炼成更短的 state_name，不允许把两个 picked state 合成一个。
- states[0].state_id 必须是 1，且 last_state 为 null；
- 每个后续 state 的 last_state 必须是**已经在列表里**的前序 state_id；
- 同一个 last_state 可以被多个后续 state 引用（分支场景）；
- states.length ≥ 3，且按用户在 Phase 2 的保留结果裁剪。

## ⚠️ last_state 的语义（重点 - 这是"视觉血统"而不是"操作时间序"）

**last_state ≠ 用户操作的时间顺序上的上一态。**
**last_state = 在已有 states 中，"视觉骨架最接近当前 state、最适合作为打补丁底版"的那个 state。**

后续生成器会用 \`last_state\` 指定的那个 state 的完整 HTML 作为底版，再叠加少量补丁来产出当前 state。所以 last_state 必须选**视觉上最接近的、改动量最小的那个 state**，而不是用户视角的"刚才那一步"。

### 典型反例（请避免）
任务流：主页 → 编辑页 → 提交中 → 保存成功（回主页） → 取消编辑（回主页） → 错误（停在编辑页）
**错误**写法（按时间序）：
  state_4 (保存成功回主页)  last_state=3 (提交中)   ❌ 提交中是个遮罩页，骨架完全不是主页
  state_5 (取消回主页)      last_state=2 (编辑页)   ❌ 编辑页是个全屏新页，骨架完全不是主页
  state_6 (编辑页错误)      last_state=2 (编辑页)   ✅ 视觉骨架就是编辑页，正确

**正确**写法（按视觉骨架）：
  state_4 (保存成功回主页)  last_state=1 (主页)     ✅ 视觉骨架=主页，新增 Toast / 改文字
  state_5 (取消回主页)      last_state=1 (主页)     ✅ 视觉骨架=主页（没有任何变化）
  state_6 (编辑页错误)      last_state=2 (编辑页)   ✅ 视觉骨架=编辑页，新增红色错误文字

### 怎么选 last_state（每个非 state_1 的 state 你都要回答这两个问题）
1. "如果我要让 LLM 在这个 state 上做最少的改动来产出当前 state，应该选哪一个 state？"
2. "当前 state 的页面骨架（导航栏 / 内容主体 / 底部 Tab / 是否全屏页）和已有的哪个 state 最像？"

回答 = last_state。

### 常见模式
- **回主页 / 回详情页 / 回原页面**类 state → last_state 选那个原页面（通常是 state_1 或某个详情态），**不是**选"刚才那个弹窗 / 全屏遮罩 / 全屏编辑页"。
- **某页面的某子状态**（错误态、加载态、Toast 提示态）→ last_state 选"那个页面的最干净版本"。
- **全屏新页面**（编辑页、设置页、详情页等）→ last_state 通常仍是 state_1（因为它是从主页跳转过来的，需要从主页 wipe 改造）。
- **遮罩 + 弹窗**类 state → last_state 选"被遮罩盖住的那个底页"（通常是 state_1 或主流程中的某态）。

仅返回 JSON，禁止任何其它内容、禁止 <think>、禁止 Markdown 包裹。
`.trim();

/** 基于当前 phase 组装一轮 prompt。
 *  phase 1/2/3 = 多轮对话澄清；phase 4 = 收尾 done（产出最终 taskflow 结构，不再询问）。 */
function buildPhasePrompt(phase, ctx) {
  const instr = {
    1: PHASE1_INSTRUCTION,
    2: PHASE2_INSTRUCTION,
    3: PHASE3_INSTRUCTION,
    4: PHASE5_INSTRUCTION,
  }[phase];
  if (!instr) throw new Error(`unknown phase ${phase}`);

  return `${buildConversationContext(ctx)}

========【你的本轮任务】========
${instr}`;
}

module.exports = {
  TASKFLOW_INTENT_SYSTEM_PROMPT,
  buildPhasePrompt,
  buildConversationContext,
};
