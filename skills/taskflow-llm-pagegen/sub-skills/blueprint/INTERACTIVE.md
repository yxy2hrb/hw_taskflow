# Blueprint 编号交互操作手册

## 运行原则

蓝图阶段默认使用纯文本编号交互：

1. `generate --phase N` 生成 ask 或 preview。
2. CLI 将每个选项显示为 `[1] / [2] / [3]`。
3. 用户输入要保留的编号，使用逗号分隔。
4. 如需修改，输入对应编号，再输入新内容。
5. 输入 `done` 完成修改并确认当前 Phase。

不再要求用户手工编写 feedback JSON。原 JSON 输入仍兼容。

## 基本命令

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js confirm \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint \
  --phase 1
```

执行后会显示编号视图并进入交互输入。

## Phase 1

四个分组中的选项使用全局连续编号。每组必须选择一个：

```text
① Actor
[1] 已登录用户
[2] 首次访问用户

② Trigger
[3] 点击创建按钮
[4] 从列表菜单进入

③ Goal & Happy Path
[5] ...
[6] ...

④ Success Criteria
[7] ...
[8] ...

请输入四个选项编号：
> 1,3,5,7
```

修改已选项：

```text
要修改的编号（或 done）：
> 5
请输入新的内容：
> 用户修改后的完整 happy path

要修改的编号（或 done）：
> done
```

## Phase 2

输入要保留的状态编号：

```text
请输入要保留的状态编号：
> 1,2,3,5
```

`state_1` 必须保留，确认后的状态数量仍需不少于 4。

只修改状态名称：

```text
要修改的编号：
> 3
请输入新的内容：
> 已填写可提交状态
```

同时修改名称和 description：

```text
> 已填写可提交状态 | 触发条件：用户完成必填项。展示信息：字段已有值，确认按钮可点击。继承信息：继承 state_2 的表单骨架。
```

名称和完整 description 之间使用 `|` 分隔。

## Phase 3

每个非初始状态只有一份 UI 实现草案。输入要保持原样的编号：

```text
请输入要保留原内容的编号：
> 1,2,3,4
```

直接按回车表示全部保留。

单独修改一个状态的 UI 实现：

```text
要修改的编号：
> 3
请输入新的内容：
> 保留上一状态的顶部导航和主体骨架，在底部按钮区域显示 loading，并禁用重复提交。
```

未修改编号继续使用生成草案，修改编号在 confirmed 中记为 `custom`。

## Phase 4

输入要保持原样的状态编号，直接回车表示全部保留。

只修改非初始状态的 implementation：

```text
要修改的编号：
> 3
请输入新的内容：
> 最终确认的 UI 实现方案
```

同时修改名称、description 和 implementation：

```text
> 最终状态名 | 触发条件：...展示信息：...继承信息：... | 最终 UI 实现方案
```

三个字段使用 `|` 分隔。

## 编号文本文件

需要非交互执行时，可以使用简单文本文件，不必写 JSON。

第一行是保留编号，后续每行是 `编号=修改内容`：

```text
1,2,3,4
3=修改后的内容
4=另一项修改内容
```

执行：

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js confirm \
  --session-dir new_test/2/.run_skill/{stamp}/blueprint \
  --phase 3 \
  --input feedback.txt
```

Phase 3/4 全部保留时，文本文件第一行可写：

```text
all
```

## JSON 兼容

已有的 `feedback.json` 无需修改，CLI 会先尝试按 JSON 解析；不是 JSON 时才按编号文本解析。

## Auto 模式

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/blueprint/scripts/run_skill.js auto \
  --dirs new_test/2 \
  --model qwen3.7-max
```

auto 模式不进入终端编号交互，行为保持不变。
