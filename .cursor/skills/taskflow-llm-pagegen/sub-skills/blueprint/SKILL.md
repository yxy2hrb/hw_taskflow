---
name: taskflow-blueprint
description: >
  任务流蓝图生成顶层 Skill。输入"任务流描述 + 页面 DSL"，通过 4 个子 Agent 协作，
  产出驱动代码生成的 blueprint.json。
  子 Skill: user-story | state-enumeration | implementation-plan | blueprint-builder
---

# 任务流蓝图生成（顶层 Skill）

## 目标

将一段自然语言任务流描述，结合初始页面 DSL 信息，生成一份结构化 `blueprint.json`。
该文件直接驱动第二阶段逐 state 增量生成 HTML。

## 输入

| 参数 | 说明 |
|------|------|
| `brief` | 任务流简要描述（自然语言，1–3 句） |
| `page_dsl` | 初始页面结构描述（来自 `spec.json` 或 `pre-process` 阶段产出） |

## 输出

`blueprint.json`，结构：

```json
{
  "meta": {
    "title": "任务流标题（8–14 字）",
    "slug": "url-safe-ascii-slug",
    "user_story": "一句话 User Story",
    "platform": "mobile | desktop"
  },
  "states": [
    {
      "state_id": 1,
      "state_name": "初始态短标签（10–18 字）",
      "description": "静态最终视觉描述（35–100 字）",
      "implementation_method": "state_1 固定写'原始 HTML 初始快照，不做改造'",
      "last_state": null
    },
    {
      "state_id": 2,
      "state_name": "...",
      "description": "...",
      "implementation_method": "基于 last_state=state_X：保留A/B；删除C；新增D/E。",
      "last_state": 1
    }
  ]
}
```

### `states` 硬性格式规则

`states` 必须是**对象数组**，数组中的每一项都是完整 state 对象。

禁止以下错误格式：

```json
{ "states": ["state_1", "state_2"] }
```

```json
{ "states": ["state_id", "state_name", "description", "implementation_method", "last_state"] }
```

```json
{ "states": ["state_id: 1", "state_name: 初始态", "description: ..."] }
```

正确格式：

```json
{
  "states": [
    {
      "state_id": 1,
      "state_name": "初始态",
      "description": "...",
      "implementation_method": "原始 HTML 初始快照，不做改造",
      "last_state": null
    }
  ]
}
```

## 执行流程（4 个子 Skill 顺序调用）

```
brief + page_dsl
    │
    ▼
[Sub-skill 1] user-story
  └─ 产出：user_story 四维确认（Actor / Trigger / Goal / Success Criteria）
    │
    ▼
[Sub-skill 2] state-enumeration
  └─ 产出：按时间序排列的 happy-path 状态清单（初始态、必要中间态、成功终态）
    │
    ▼
[Sub-skill 3] implementation-plan
  └─ 产出：每个非 state_1 的 state 的 UI 实现方式（2–3 个候选 → 用户确认一个）
    │
    ▼
[Sub-skill 4] blueprint-builder
  └─ 产出：blueprint.json（含完整 meta + states[]）
```

## 质量门禁

- [ ] `meta` 字段齐全（title / slug / user_story / platform）
- [ ] `states[0].state_id === 1`，`last_state === null`
- [ ] `states` 是对象数组，不是字符串数组、字段名数组或 `state_id: ...` 文本数组
- [ ] 每个后续 state 的 `last_state` 指向前序已有 state_id
- [ ] `states.length >= 3`
- [ ] 每个非 state_1 的 `implementation_method` 包含「基于 last_state」「保留」「删除」「新增」四段
- [ ] 状态清单仅覆盖 happy-path；不主动生成失败态、异常态、取消态
- [ ] Phase 2 确认的 state 一一对应出现，禁止合并或省略


