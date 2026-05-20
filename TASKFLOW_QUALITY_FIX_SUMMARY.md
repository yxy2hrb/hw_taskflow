# 任务流生成质量修复说明

本文记录本次围绕 `2_4 / 2_5 / 6_1` 暴露问题所做的代码修改，重点是让任务流生成链路从“尽量生成完成”转为“先拦住坏输入，再暴露坏输出，并留下可人工验收的最终产物”。

## 修改目标

本次修复针对的问题包括：

- `blueprint` 明显不合法时仍会落盘并继续生成。
- 非 `state_1` 的 `last_state` 缺失时，会被静默兜底成 `1`，掩盖真实错误。
- Vision review 失败或返回空时，链路仍可能把 state 当作正常完成。
- `review.png` 容易被误认为最终结果，但它实际是 review 前的截图。
- 生成结果缺少统一的静态质量检查，例如 icon 文本裸露、资源缺失、viewport 溢出、无遮罩语义被破坏。
- legacy patch prompt 过度倾向“居中遮罩弹窗”，容易导致 bottom sheet、全屏页、无遮罩状态生成错误。

## 新增文件

### `backend/src/taskflowQuality.js`

新增任务流质量检查模块，集中承载生成前和生成后的硬性校验。

主要能力：

- `validateBlueprint(bp)`
  - 校验 `states.length >= 2`。
  - 校验 `state_1` 必须是 `state_id=1`，且 `last_state` 为 `null` 或缺省。
  - 校验非 `state_1` 的 `last_state` 必须存在，且必须指向此前已经出现的 state。
  - 校验 `state_id` 不重复。
  - 校验非首态的 `implementation_method` 包含“基于 last_state + 保留/删除/新增”三段式。

- `validateStateHtml(...)`
  - 检测可见 icon ligature 文本残留，例如 `close`、`check_circle`、`arrow_back`、`wifi`、`qr_code`。
  - 检测“无遮罩 / 无弹窗 / no overlay / no modal”语义下是否仍出现全屏暗色遮罩。
  - 检测 HTML 引用的图片、字体、CSS 等资源是否缺失。
  - 通过 Playwright 探测明显 viewport 横向溢出。

- `writeFinalScreenshot(...)`
  - 对最终 HTML 生成 `state_N_final.png`，用于人工验收最终状态。

为什么新增：

原来的质量判断分散在生成逻辑、review 逻辑和人工观察中，没有一个可复用的质量入口。新增该模块后，API 生成流程和离线评估脚本可以复用同一套规则，避免线上生成和本地验收标准不一致。

预期效果：

- 坏 blueprint 在生成前被阻断。
- 坏 state 在生成后被明确标记。
- 质量问题能写入 manifest 和评估报告，而不是只存在于日志或截图观察中。

### `scripts/evaluate_taskflow.js`

新增离线评估脚本。

用法：

```bash
node scripts/evaluate_taskflow.js new_test/2_4/html/_taskflow_xxx
```

脚本会：

- 读取 `blueprint.json` 并执行 blueprint 校验。
- 遍历 `state_*.html`。
- 如果缺少 `state_N_final.png`，自动补截图。
- 检查 review 状态、icon 文本裸露、资源缺失、viewport 溢出等问题。
- 输出控制台报告。
- 写入 `quality_report.json`。

为什么新增：

之前没有一个稳定、可重复的命令来验收已有生成目录。很多问题只能靠手动打开截图或阅读 `console.log`。该脚本让历史产物和新产物都能用同一套规则快速评估。

预期效果：

- 回归验证可以从人工观察转成可重复脚本。
- `2_4 / 2_5 / 6_1` 这类问题可以在报告里明确暴露。
- 后续可以把该脚本接入批量测试或 CI。

## 修改文件

### `backend/src/taskflowOneClick.js`

这是本次改动的核心文件，主要修改任务流一键生成的入口、blueprint 落盘、逐 state 生成和 manifest 输出。

#### 1. `/api/oneclick/answer` 增加 blueprint 强校验与一次修复重试

新增逻辑：

- LLM 返回最终 blueprint 后，先执行 `validateBlueprint()`。
- 如果第一次无效，会把 validation issues 和无效 blueprint 回传给 LLM，要求重新生成完整 blueprint。
- 如果第二次仍无效，直接返回 `500` 和具体 validation issues。
- 无效 blueprint 不会写入 `taskflow.json` / `blueprint.json`。

为什么要做：

以前即使 blueprint 只有一个 state、`last_state:null`、或三段式缺失，也可能继续落盘并进入生成阶段。这会让后续错误变成页面生成问题，排查成本很高。

预期效果：

- 错误更早暴露。
- `6_1` 中 `state_2.last_state = null` 这类问题不会再被带入 patch 阶段。
- 生成目录里不会再留下“看起来完整但基础数据非法”的产物。

#### 2. `/api/oneclick/blueprint` 手动注入也强校验

新增逻辑：

- 手动覆盖 blueprint 时同样执行 `validateBlueprint()`。
- 校验失败返回 `400`。
- 不再 persist 非法 blueprint。

为什么要做：

手动注入是绕过 LLM 对话的入口。如果这里不校验，依然可能把坏 blueprint 注入生成链路。

预期效果：

- 自动生成和手动注入使用同一质量标准。
- 调试时不会因为手动注入绕过核心质量闸门。

#### 3. 移除 `last_state || 1` 静默兜底

修改前：

```js
const lastId = st.last_state || 1;
```

修改后：

- `last_state === null || last_state === undefined` 直接 `state-fail`。
- `taskflow.json` 中也保留真实 `last_state`，不再把缺失值写成 `1`。

为什么要做：

`last_state || 1` 会把非法数据伪装成合法链路，导致后续看不出 state 的真实依赖关系。

预期效果：

- 依赖链错误能被明确定位。
- manifest 和 taskflow 文件不再隐藏非法输入。

#### 4. 生成最终截图

新增产物：

- `state_1_final.png`
- `state_N_review_before.png`
- `state_N_final.png`

说明：

- `state_N_review_before.png` 是 Vision review 前的截图。
- `state_N_final.png` 是所有 patch、review 修复、后处理完成后的最终截图。

为什么要做：

以前 `review.png` 容易被当作最终结果，但如果 review 之后又应用了修复，它并不代表最终页面。

预期效果：

- 人工验收应优先看 `state_N_final.png`。
- review 前后状态不再混淆。

#### 5. manifest 增加质量字段

每个 state 现在会在 `manifest.json` 中带上：

- `finalScreenshot`
- `finalScreenshotOk`
- `finalScreenshotError`
- `reviewOk`
- `reviewStatus`
- `reviewIssues`
- `validationOk`
- `validationIssues`
- `assetWarnings`
- `quality_failed`

为什么要做：

之前 manifest 只记录文件和基础 state 信息，无法表达“生成了但质量失败”。现在质量状态会成为产物的一部分。

预期效果：

- 调用方不需要解析日志就能知道每个 state 是否可用。
- 后续批量评估可以直接消费 manifest。

#### 6. review 失败或不可用时不再算正常完成

新增行为：

- `review.ok === false` 时，state 会带 `quality_failed: true`。
- `review === null` 会标记为 `review_unavailable`。
- 质量失败时通过 `state-fail` 事件暴露，而不是静默 `state-done`。

为什么要做：

以前 Vision review 失败、返回空或不可用时，很容易被当成通过。这样会把明显有问题的页面写成“完成态”。

预期效果：

- 生成链路更诚实地暴露失败。
- 前端或批量脚本可以根据 `state-fail` 和 `quality_failed` 做拦截。

### `backend/src/taskflowPatch.js`

修改 legacy `[OLD]/[NEW]` patch prompt，减少错误布局和语言混用。

#### 1. 增加布局类型判断

根据当前 state 的 `state_name / description / implementation_method` 判断推荐布局：

- `Bottom Sheet`
- `Centered Dialog`
- `Full Screen Page`

新增 prompt 规则：

- Bottom Sheet 必须贴底，`align-items:flex-end`，顶部圆角。
- Centered Dialog 才使用居中遮罩。
- Full Screen Page 必须使用不透明背景，不走半透明遮罩。

为什么要做：

原 prompt 原来要求所有弹窗 / 浮层都居中遮罩，导致底部抽屉、全屏页等状态被错误生成成居中弹窗。

预期效果：

- `2_4` 这类筛选面板不会被强行居中。
- 全屏页不会出现透明遮罩残留。
- bottom sheet 更符合真实移动端交互形态。

#### 2. 加强英文页面语言约束

新增规则：

- 主语言为英文时，筛选项、排序项、状态标签必须用英文。
- 禁止出现“最新到最早 / 降序 / 确认 / 取消”等中文。

为什么要做：

`2_4` 暴露了英文页面新增筛选 UI 却混入中文文案的问题。

预期效果：

- 英文页面新增 UI 文案保持英文。
- 语言混用问题能在生成前 prompt 和生成后静态校验中双重约束。

#### 3. 禁止 icon ligature 名作为普通文本残留

新增规则：

- `close / check_circle / arrow_back / wifi / qr_code` 等不得作为普通可见文本残留。
- 如果无法保证字体渲染，要求使用内联 SVG 或 CSS 兜底。

为什么要做：

部分生成结果中 Material Icons / HMSymbol ligature 没有正确渲染，用户看到的是 `close`、`wifi` 这类英文文本。

预期效果：

- 生成阶段减少裸露 icon 文本。
- 静态质量检查可以继续兜底发现残留。

#### 4. 加强 no-overlay 语义

新增规则：

- 如果 description 或 implementation_method 明确写“无遮罩 / 无弹窗 / no overlay / no modal”，禁止生成暗色遮罩或全屏 modal 根节点。

为什么要做：

之前 prompt 对 overlay 的默认偏好过强，即使需求要求无遮罩，也可能生成 `rgba(0,0,0,0.40)`。

预期效果：

- “无遮罩”语义能被明确执行。
- 生成后如果仍出现遮罩，会被 `taskflowQuality` 标记失败。

### `backend/src/patchReview.js`

修改 review 空结果的日志语义。

修改前：

- Vision review 返回无效 JSON 时，日志写“按通过处理”。

修改后：

- 日志写“标记 review_unavailable”。

为什么要做：

review 不可用和 review 通过是两回事。把不可用当通过会掩盖质量风险。

预期效果：

- review 状态更准确。
- 上层 manifest 和 SSE 事件可以把 `review_unavailable` 暴露出来。

### `backend/src/integrations/htmlScreenshot.js`

新增 `closeScreenshotBrowser()`。

为什么要做：

离线评估脚本会启动 Playwright Chromium。如果不主动关闭浏览器单例，脚本可能长时间不退出。

预期效果：

- `scripts/evaluate_taskflow.js` 跑完后能干净退出。
- 不影响原有 `screenshotHtmlString()` 调用方式。

## 验证情况

已执行语法检查：

```bash
node --check backend/src/taskflowOneClick.js
node --check backend/src/taskflowPatch.js
node --check backend/src/taskflowQuality.js
node --check backend/src/integrations/htmlScreenshot.js
node --check scripts/evaluate_taskflow.js
```

已做快速规则验证：

- 单 state blueprint 会失败。
- 非首态 `last_state:null` 会失败。
- 重复 `state_id` 会失败。
- `<span class="mi">close</span>` 会被识别为 icon 文本裸露。
- “无遮罩”需求下出现 `rgba(0,0,0,0.40)` 和 `position:fixed; inset:0` 会失败。

已对历史产物执行：

```bash
node scripts/evaluate_taskflow.js new_test/6_1/html/_taskflow_20260520_175740
```

评估结果成功暴露：

- blueprint invalid。
- `state_2.last_state` 缺失。
- 多个 state 存在 viewport 溢出。
- `state_3` 存在 `arrow_back` icon 文本裸露。
- `state_4` 存在 `wifi` icon 文本裸露。

## 预期整体效果

本次改动后，任务流生成链路会更严格：

1. 生成前拦住坏 blueprint。
2. 生成中不再默默修正非法 `last_state`。
3. 生成后为每个 state 留下最终截图。
4. review 不通过或不可用会明确暴露。
5. 静态质量问题会进入 manifest 和评估报告。
6. 人工验收可以优先看 `state_N_final.png`，不再误用 review 前截图。

这不会保证每次 LLM 生成的 UI 都正确，但会显著减少“明显错误却被标记为完成”的情况，并让后续问题定位更直接。
