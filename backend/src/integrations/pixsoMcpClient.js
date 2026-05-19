/**
 * Pixso MCP 客户端封装。
 *
 * 默认走 Remote MCP（https://pixso.net/api/mcp/mcp），靠 Personal Access Token 鉴权。
 * 也可以切到 Local MCP（http://localhost:3667/mcp），通过设置 PIXSO_MCP_URL。
 *
 * 必填环境变量（.env）：
 *   PIXSO_PAT               —— Personal Access Token，团队版/企业版工作台 → 用户中心 → 生成
 *   PIXSO_MCP_URL           —— 默认 https://pixso.net/api/mcp/mcp，Local MCP 写 http://localhost:3667/mcp
 *
 * 主要 API：
 *   const c = await getClient();
 *   await c.listTools();                            // 调试：看可用工具
 *   await c.callTool("get_local_styles", { fileKey });
 *   await c.callTool("get_variables",   { fileKey });
 *   await c.callTool("get_variable_sets", { fileKey });
 *   await c.callTool("get_variants",    { componentSetKey });
 *   await c.callTool("get_code",        { url });   // frame 链接 -> HTML
 *   await c.callTool("get_image",       { url });
 *
 * 注：返回值是 MCP 协议的 { content: [...] } 形态；本封装的 callToolJson 会
 * 把 content 里的 text/json 抽出来，尽可能返回 JS 对象供调用方用。
 */
"use strict";

const path = require("path");
try { require("dotenv").config({ path: path.resolve(__dirname, "../../.env") }); } catch { /* ok */ }

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const DEFAULT_REMOTE = "https://pixso.net/api/mcp/mcp";

let _clientPromise = null;

async function buildClient() {
  const pat = process.env.PIXSO_PAT || "";
  const mcpUrl = process.env.PIXSO_MCP_URL || DEFAULT_REMOTE;
  const isRemote = !mcpUrl.includes("localhost") && !mcpUrl.includes("127.0.0.1");

  if (isRemote && !pat) {
    throw new Error("缺少 PIXSO_PAT，无法连 Remote MCP。请在 backend/.env 里配置 PIXSO_PAT=<your token>");
  }

  const client = new Client({ name: "p2p-taskflow", version: "1.0.0" });

  /** @type {Record<string,string>} */
  const headers = {};
  if (isRemote && pat) headers.Token = pat; // Pixso Remote MCP 协议要求 header 名是 Token

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: { headers },
  });

  await client.connect(transport);
  return { client, transport, mcpUrl, isRemote };
}

/** 单例：进程内复用同一连接（避免 MCP 反复握手）。 */
async function getClient() {
  if (!_clientPromise) {
    _clientPromise = buildClient().catch((e) => { _clientPromise = null; throw e; });
  }
  return _clientPromise;
}

async function listTools() {
  const { client } = await getClient();
  const r = await client.listTools();
  return r.tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

async function callToolRaw(name, args) {
  const { client } = await getClient();
  return await client.callTool({ name, arguments: args || {} });
}

/**
 * 调用工具并把 content 扁平化为 JS 对象。
 * Pixso MCP 工具返回常见三种 content：
 *   { type: "text", text: "..." }       —— 可能是 JSON 字符串
 *   { type: "json", data: {...} }       —— 直接 JS 对象
 *   { type: "image", mimeType, data }   —— base64 图片
 * 本函数尝试解析 text 为 JSON；解析失败则原样返回 text。
 */
async function callToolJson(name, args) {
  const r = await callToolRaw(name, args);
  if (!r || !Array.isArray(r.content)) return r;

  const parts = r.content.map((c) => {
    if (c.type === "json" && c.data !== undefined) return c.data;
    if (c.type === "text" && typeof c.text === "string") {
      const t = c.text.trim();
      if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
        try { return JSON.parse(t); } catch { /* ignore */ }
      }
      return c.text;
    }
    if (c.type === "image") return { __image: true, mimeType: c.mimeType, data: c.data };
    return c;
  });

  if (parts.length === 1) return parts[0];
  return parts;
}

async function close() {
  if (!_clientPromise) return;
  try {
    const { client } = await _clientPromise;
    await client.close();
  } catch { /* ignore */ }
  _clientPromise = null;
}

module.exports = {
  getClient,
  listTools,
  callToolRaw,
  callToolJson,
  close,
};
