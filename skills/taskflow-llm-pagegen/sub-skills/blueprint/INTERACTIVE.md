# Blueprint Interactive 操作手册

## 运行原则

蓝图阶段默认 interactive。Agent 每次只推进一个 phase：

1. 调用 `generate --phase N`。
2. 渲染 `phaseN_ask.json` 或 `phase4_preview.json`。
3. 收集用户选择、编辑或完整 JSON。
4. 写成 feedback JSON。
5. 调用 `confirm --phase N --input feedback.json`。
6. 再进入下一 phase。

`resume` 只会在 `idle` 时继续生成；遇到 `awaiting_confirm` 只展示当前待确认视图。

## 命令

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js init \
  --dirs new_test/2 \
  --model qwen3.7-max
```

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js generate \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint \
  --phase 1
```

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js confirm \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint \
  --phase 1 \
  --input feedback.json
```

## Feedback 格式

### Phase 1

方式 A：提交选项。

```json
{
  "selections": {
    "actor": "actor_1",
    "trigger": "trigger_1",
    "happy_path": "goal_1",
    "success_criteria": "success_1"
  },
  "custom_overrides": {}
}
```

方式 B：提交完整 `phase1_confirmed.json`。

### Phase 2

默认全部保留时：

```json
{ "confirm_all": true }
```

只保留指定状态并可局部编辑：

```json
{
  "selected_ids": ["state_1", "state_2", "state_3", "state_4"],
  "edits_by_id": {
    "state_2": {
      "label": "编辑后的状态名",
      "description": "触发条件：...\n展示信息：...\n继承信息：..."
    }
  },
  "custom_states": []
}
```

### Phase 3

每个非 `state_1` 只有一份 UI 实现草案。全部接受时：

```json
{
  "confirm_all": true
}
```

需要修改某些状态时，只提交这些 state：

```json
{
  "edits_by_state": {
    "state_3": {
      "implementation_plan": "用户自定义完整实现方案..."
    }
  }
}
```

未出现在 `edits_by_state` 中的状态保持原始实现草案。

### Phase 4

直接确认预览：

```json
{ "confirm": true }
```

编辑合并结果后确认。可以只提交被编辑的 state，脚本会与 preview 中其它 state 合并：

```json
{
  "merged_states_by_id": {
    "state_1": {
      "id": "state_1",
      "label": "初始页面状态",
      "description": "触发条件：...\n展示信息：...\n继承信息：无。",
      "implementation": null
    }
  }
}
```

## Auto 模式

批量模式使用：

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js auto \
  --dirs new_test/2 \
  --model qwen3.7-max
```

auto 会复用同一 session 目录结构，并自动接受 Phase 3 的单一实现草案。
