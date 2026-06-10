---
name: taskflow-llm-pagegen
description: >
  Runs the self-contained taskflow pipeline that generates static taskflow pages
  from state_implementation_model with an LLM. Use when generating pages from
  new_test cases with preprocessing, blueprint creation, state implementation
  modeling, and LLM-authored static state layers.
---

# Taskflow LLM Pagegen

Top-level orchestration skill for the latest taskflow pipeline.

It is self-contained: use only files under this skill directory.

## Entry

默认使用交互式蓝图流程：

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 --model qwen3.7-max
```

首次运行会完成 preprocess、初始化 blueprint session、生成 Phase 1 ask，然后正常暂停。
确认当前 Phase 后，使用同一个 `--stamp` 或 `--blueprint-session-dir` 再次运行顶层命令。
只有蓝图 session 达到 `completed` 后，才继续 state implementation 和 codegen。
恢复同一运行时，未重复传入的 model、codegen、输入路径和 viewport 会从
`input_manifest.json` 继承。

Unified input form:

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 --image new_test/2/wps_doc_0.png --html new_test/2/html/Index.original.html --input new_test/2/input.txt --width 360 --height 792
```

Switch code generation implementation:

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 --width 360 --height 792 --codegen code_gen2
```

Inputs:

- `--image`: source screenshot path. Used to infer viewport size when `--width/--height` are omitted.
- `--html`: source D2C HTML path.
- `--input`: taskflow brief text path.
- `--width`: optional viewport width. Width is locked throughout generation.
- `--height`: optional initial viewport height. Generated pages may be taller if content does not fit.
- `--codegen`: optional codegen implementation. Use `codegen` for the default
  static pipeline or `code_gen2` for the React-first component pipeline.
- `--blueprint-mode`: `interactive | auto`，默认 `interactive`。
- `--blueprint-session-dir`: 复用已有 blueprint session。适合用户确认某个 Phase 后继续整体流程。
- `--stamp`: 固定整体运行目录；交互式多次调用时可复用同一个 stamp。

The top-level runner only coordinates sub-skills and writes the final run report.

## Interactive Blueprint Flow

首次启动：

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 \
  --model qwen3.7-max \
  --stamp 20260610120000
```

顶层 runner 会在以下位置创建 session：

```text
new_test/2/.run_skill/20260610120000/blueprint/
```

查看待确认视图：

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js status \
  --session-dir new_test/2/.run_skill/20260610120000/blueprint
```

提交当前 Phase 的用户反馈：

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js confirm \
  --session-dir new_test/2/.run_skill/20260610120000/blueprint \
  --phase 1 \
  --input feedback.json
```

继续整体流程：

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 \
  --model qwen3.7-max \
  --stamp 20260610120000
```

也可直接指定 session：

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 \
  --blueprint-session-dir new_test/2/.run_skill/20260610120000/blueprint
```

每次蓝图进入 `awaiting_confirm`，顶层 runner 都会以退出码 0 暂停，并在
`run_report.json` 的 `blueprint` 字段中写入当前 Phase、待确认文件和下一步命令。

批量/CI 模式保持全自动：

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 \
  --blueprint-mode auto
```

## Sub-skill Structure

1. `sub-skills/preprocess`
   - Generates `spec.json` page DSL from the source screenshot when missing.
   - Collects div bbox data.
   - Generates div semantic annotations.
   - Replaces HTML body with semantic comments.
   - Builds `semantic_registry.json` and `semantic_anchors.js`.

2. `sub-skills/blueprint`
   - Generates the taskflow blueprint in four interactive phases.
   - Each phase follows `generate -> user confirmation/edit -> confirm`.
   - Stores checkpoints in a unified blueprint session directory.
   - Stops the top-level pipeline while the session is `awaiting_confirm`.
   - Supports `--blueprint-mode auto` for batch execution.
   - Uses nested prompt sub-skills:
     - `sub-skills/blueprint/sub-skills/user-story/SKILL.md`
     - `sub-skills/blueprint/sub-skills/state-enumeration/SKILL.md`
     - `sub-skills/blueprint/sub-skills/implementation-plan/SKILL.md`
     - `sub-skills/blueprint/sub-skills/blueprint-builder/SKILL.md`

3. `sub-skills/codegen` or `sub-skills/code_gen2`
   - Generates state implementation model.
   - Generates static page layers.
   - Performs HTML post-processing and screenshot validation.
   - Selected by `--codegen codegen|code_gen2`.
   - Uses nested prompt sub-skills:
     - `sub-skills/codegen/sub-skills/state-implementation-model/SKILL.md`
     - `sub-skills/codegen/sub-skills/page-layer/SKILL.md`

## Outputs

- `.run_skill/<stamp>/preprocess`
- `spec.json` when the input case does not already provide page DSL
- `.run_skill/<stamp>/blueprint`
  - `session.json`
  - `stages/phaseN_ask.json` / confirmed files
  - `stages/blueprint_builder_input.json`
  - `logs/` and `validation/`
- `.run_skill/<stamp>/state_implementation`
- `.run_skill/<stamp>/llm_layer_codegen`
- `html/Index.state-model.llm-layers.html`

## Prompt vs Rule Boundary

Prompt-driven:

- Preprocess semantic annotation prompt inside `sub-skills/preprocess/scripts/run_preprocess.js`.
- Blueprint phase 1-3 prompt sub-skills.
- State implementation model prompt sub-skill.
- Page layer prompt sub-skill.

Rule-driven:

- Playwright bbox collection.
- Semantic registry construction.
- Blueprint phase4 merge.
- Blueprint session state transitions and phase validation.
- State model normalization and validation.
- Page-layer JSON validation.
- Keep-placeholder fill.
- HTML assembly.
- Playwright screenshot validation.

## Constraints

- Do not call repository-root `scripts/*.js`.
- Do not call old taskflow codegen skills.
- Do not use legacy patch, rule-based layer codegen, interactive codegen, or auto-interaction codegen.
- The final page layers are generated by an LLM from `state_implementation_model.llm.json`.
- React + Ant Design are used as component-design reference, but the runnable output is static HTML/CSS layers for reliable local screenshot validation.
- Interaction flow is out of scope for this skill version; validate static state screenshots only.
