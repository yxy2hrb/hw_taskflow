---
name: taskflow-blueprint
description: >
  任务流蓝图生成顶层 Skill。输入任务流描述和页面 DSL，通过 4 个可确认阶段生成
  blueprint_builder_input.json。默认 interactive，支持 checkpoint 恢复与 auto 批量模式。
---

# 任务流蓝图生成（Interactive）

## 目标

将自然语言任务流描述和初始页面 DSL 转换为下一阶段代码生成使用的
`blueprint_builder_input.json`。蓝图阶段默认不再一口气连跑 4 步，而是每步：

```text
generate 结构化草案 -> 展示给用户 -> confirm 用户确认/修改 -> 写入 confirmed -> 下一步
```

最终产物仍是：

```text
{caseDir}/.run_skill/{stamp}/blueprint/stages/blueprint_builder_input.json
```

## Session 目录

每次蓝图运行使用单一 session 目录：

```text
{caseDir}/.run_skill/{stamp}/blueprint/
  session.json
  stages/
    phase1_ask.json
    phase1_confirmed.json
    phase2_ask.json
    phase2_confirmed.json
    phase3_ask.json
    phase3_confirmed_by_id.json
    phase4_preview.json
    blueprint_builder_input.json
  logs/
    phase1_raw.json
    phase2_raw.json
    phase3_raw.json
  validation/
    phase1_report.json
    phase2_report.json
    phase3_report.json
    phase4_report.json
```

`session.json.status` 取值：`idle | generating | awaiting_confirm | confirmed | completed | failed`。

## CLI

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js init \
  --dirs new_test/2 \
  --model qwen3.7-max

node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js generate \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint \
  --phase 1

node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js confirm \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint \
  --phase 1

node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js resume \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint

node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js status \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint

node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js auto \
  --dirs new_test/2 \
  --model qwen3.7-max
```

旧 `--skill taskflow-user-story` 参数已废弃；使用 `generate/confirm --phase N`。

## 用户输入

`confirm` 默认进入纯文本编号交互：

```text
请输入要保留的编号：
> 1,2,3,4

要修改的编号（或 done）：
> 3

请输入新的内容：
> 修改后的内容
```

- Phase 1：四个分组各选择一个编号。
- Phase 2：编号表示保留的 state。
- Phase 3：编号表示保持原样的 UI 实现；可逐状态修改。
- Phase 4：编号表示保持原样的合并状态；可逐状态修改。
- 输入 `done` 完成修改。
- `--input feedback.txt` 支持第一行编号、后续 `编号=内容`。
- 原有 `--input feedback.json` 继续兼容。

## 阶段状态机

```text
Phase 1 generate -> phase1_ask.json
Phase 1 confirm  -> phase1_confirmed.json
Phase 2 generate -> phase2_ask.json
Phase 2 confirm  -> phase2_confirmed.json
Phase 3 generate -> phase3_ask.json
Phase 3 confirm  -> phase3_confirmed_by_id.json
Phase 4 build    -> phase4_preview.json
Phase 4 confirm  -> blueprint_builder_input.json
```

`resume` 规则：

- `idle`：自动生成当前 phase 的 ask/preview。
- `awaiting_confirm`：只展示当前待确认视图，不自动确认。
- `completed`：输出最终文件路径。

## 输出契约

### Phase 1

`phase1_ask.json` 是四维度选项视图：Actor、Trigger、Goal & Happy Path、Success Criteria。
用户确认后生成 `phase1_confirmed.json`，包含：

- `selections`
- `actor/context/trigger/happy_path/goal/benefit/success_criteria`
- `acceptance_criteria_steps`
- `user_story`
- `platform`

### Phase 2

`phase2_ask.json` 是状态清单勾选视图。确认后写 `phase2_confirmed.json`：

- 只保留用户勾选或编辑后的 state。
- `state_1` 不可删除。
- `states.length >= 4`。
- confirmed 中移除 `rationale`。

### Phase 3

`phase3_ask.json` 为每个非 `state_1` 生成一份 UI 实现草案。用户可以直接确认全部草案，
也可以通过 `edits_by_state` 单独修改任意 state。确认后仍写：

```json
{
  "action": "confirmed",
  "phase": 3,
  "selections_by_state": {
    "state_2": {
      "option_id": "state_2::implementation",
      "implementation_plan": "..."
    }
  }
}
```

未修改的 state 沿用生成草案；被修改的 state 使用用户提供的 `implementation_plan`，
并将 `option_id` 记为 `custom`。

### Phase 4

Phase 4 不调用 LLM。脚本读取前三步 confirmed，生成 `phase4_preview.json`。用户可编辑
`merged_states_by_id` 后确认，最终写入 `blueprint_builder_input.json`。

## 质量门禁

- Phase 1 ask 四个 group 都存在，每组有且仅有一个 default。
- Phase 1 confirmed 包含完整 User Story 和顺序 BDD steps。
- Phase 2 confirmed 保留 `state_1`，状态数不少于 4，description 包含三段。
- Phase 3 ask 不包含 `state_1`，每个非初始 state 有且仅有一份实现草案。
- Phase 3 confirmed 每个非 `state_1` 都有最终 `implementation_plan`。
- Phase 4 输出含 `brief / user_story_confirmed / merged_states_by_id / page_dsl`。
- `merged_states_by_id.state_1.implementation === null`。
- 每个非 `state_1` 都有 `implementation.implementation_plan`。

## 子 Skill

- `user-story`：生成 Phase 1 ask；confirm 时合成 confirmed。
- `state-enumeration`：生成 Phase 2 ask；confirm 时写状态清单。
- `implementation-plan`：为每个状态生成一份实现草案；confirm 时应用逐状态修改并写 `selections_by_state`。
- `blueprint-builder`：构建 Phase 4 preview；confirm 后写最终输入。
