# PRD -> UI 原型平台

这是一个 AI 驱动的 PRD 到 UI 原型生成项目，包含前端界面、后端服务、测试案例（`new_test`/`test`）以及任务流生成与截图能力。

## 能否只上传一个代码文件？

不能。  
仅有 `baselineGenerate.js` 无法独立运行，至少还需要：

- `backend` 的完整源码与依赖（`backend/package.json`、`backend/package-lock.json`、`backend/src/**`）
- `frontend`（如果你要本地打开可视化界面）
- 测试案例目录（`new_test`、`test`）

## 项目结构

```text
p2p/
├── backend/
├── frontend/
├── new_test/
├── test/
└── README.md
```

## 环境要求

- Node.js 18+
- npm 9+

## 后端环境变量

在 `backend` 目录创建 `.env`（可由 `.env.example` 复制）：

```env
# DashScope OpenAI 兼容 API
DASHSCOPE_API_KEY=你的key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型（可选）
TEXT_MODEL=qwen-plus
VISION_MODEL=qwen-vl-max

# Pixso（可选）
PIXSO_PAT=
PIXSO_MCP_URL=https://pixso.net/api/mcp/mcp

# 生成链路开关（可选）
HM_BASELINE_ENABLED=1
HM_TWOPHASE_STRICT=1
HM_DSL_ENABLED=0
```

## 本地启动

### 1) 启动后端

```powershell
cd backend
npm install
npm run dev
```

后端默认地址：`http://localhost:3001`

### 2) 启动前端（可选）

```powershell
cd frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`

## 测试案例说明

- `new_test/`：新一批案例
- `test/`：历史基础案例

这两个目录用于驱动任务流与页面生成测试。仓库中保留原始案例输入文件，但会移除历史自动生成的 `_taskflow_*` 结果目录，避免噪音和仓库膨胀。

## 常见问题

- 启动后报 key 错误：检查 `DASHSCOPE_API_KEY`
- 前端请求失败：确认后端在 `3001` 端口正常运行
- 模型空返回：重试或降低单次生成输入规模
