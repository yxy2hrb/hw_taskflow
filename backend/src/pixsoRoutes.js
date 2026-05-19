/**
 * /api/pixso/* 路由注册：把 Pixso MCP 与本地 snapshot 串起来。
 *
 *   GET  /api/pixso/health          —— 探测 PAT / MCP 服务器是否可用
 *   GET  /api/pixso/tools           —— 列出当前 MCP 可用工具（调试用）
 *   POST /api/pixso/inspect         —— 单 frame 解析：{ url } -> { html, image }
 *   POST /api/pixso/sync            —— 全量同步：{ fileKey, fileName? } -> 写盘 snapshot
 *   GET  /api/pixso/snapshot        —— 读取本地最新 snapshot
 *   GET  /api/pixso/components      —— 单独看 components 列表
 *   GET  /api/pixso/tokens          —— 单独看 tokens
 */
"use strict";

const mcp = require("./integrations/pixsoMcpClient");
const snap = require("./integrations/pixsoSnapshot");
const { buildHarmonySnapshotSummary } = require("./prompts/harmonySnapshotPrompt");

function registerRoutes(app) {
  app.get("/api/pixso/health", async (_req, res) => {
    try {
      const tools = await mcp.listTools();
      res.json({ ok: true, mcpUrl: process.env.PIXSO_MCP_URL || "https://pixso.net/api/mcp/mcp", toolCount: tools.length });
    } catch (e) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  app.get("/api/pixso/tools", async (_req, res) => {
    try {
      const tools = await mcp.listTools();
      res.json({ tools });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // 单节点：拿 DSL（Remote 团队版只有 get_node_dsl；要 HTML/ArkUI 请走 Local MCP）
  app.post("/api/pixso/inspect", async (req, res) => {
    const { url, nodeId, fileKey } = req.body || {};
    if (!url && !(nodeId && fileKey)) {
      return res.status(400).json({ message: "需要 url（含 ?node-id）或同时给 fileKey + nodeId" });
    }
    try {
      const args = url ? { url } : { fileKey, nodeId };
      const dsl = await mcp.callToolJson("get_node_dsl", args);
      res.json({ dsl });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // 全量同步：颜色 / 字体 / 圆角 / 阴影 / 组件清单 → 写本地 snapshot.json
  app.post("/api/pixso/sync", async (req, res) => {
    const { fileKey, fileName, componentGuids = [] } = req.body || {};
    if (!fileKey) return res.status(400).json({ message: "缺少 fileKey（Pixso 文件 key 或链接末段）" });

    try {
      const result = { steps: [] };
      const log = (m) => { result.steps.push(m); };

      let localStyles = null, variableSets = null;
      try {
        log("→ get_local_styles");
        localStyles = await mcp.callToolJson("get_local_styles", { file_key: fileKey });
        log(`  ✓ ${countItems(localStyles)} 个`);
      } catch (e) { log(`  ✗ ${e.message}`); }

      try {
        log("→ get_variable_sets");
        variableSets = await mcp.callToolJson("get_variable_sets", { file_key: fileKey });
        log(`  ✓ ${countItems(variableSets)} 个 set`);
      } catch (e) { log(`  ✗ ${e.message}`); }

      // 遍历每个 set 拉变量
      const variablesByGuid = {};
      const setList = listOf(variableSets);
      for (const s of setList) {
        const guid = s.guid || s.id || s.key;
        const name = s.name || guid;
        if (!guid) continue;
        try {
          log(`→ get_variables  "${name}"`);
          const v = await mcp.callToolJson("get_variables", { file_key: fileKey, guid });
          variablesByGuid[guid] = { name, items: v };
          log(`  ✓ ${countItems(v)} 个变量`);
        } catch (e) { log(`  ✗ ${e.message}`); }
      }
      const variables = Object.values(variablesByGuid).flatMap(({ items }) => listOf(items));

      // Variants 必须传组件集 guid
      const variantsByGuid = {};
      for (const guid of componentGuids) {
        try {
          log(`→ get_variants  guid=${guid}`);
          const v = await mcp.callToolJson("get_variants", { file_key: fileKey, guid });
          variantsByGuid[guid] = v;
          log(`  ✓ ${countItems(v)} 个`);
        } catch (e) { log(`  ✗ ${e.message}`); }
      }
      const variants = Object.values(variantsByGuid).flatMap((v) => listOf(v));

      const tokens = snap.normalizeTokens({ localStyles, variables, variableSets });
      const components = normalizeComponents(variants);

      const out = snap.read();
      const next = {
        ...out,
        fetchedAt: new Date().toISOString(),
        source: { mcpUrl: process.env.PIXSO_MCP_URL || "https://pixso.net/api/mcp/mcp", fileKey, fileName: fileName || out.source.fileName || null },
        tokens,
        components,
      };
      const filePath = snap.write(next);
      log(`✓ 写入 ${filePath}`);

      res.json({
        ok: true,
        path: filePath,
        summary: {
          color: Object.keys(tokens.color).length,
          typography: Object.keys(tokens.typography).length,
          radius: Object.keys(tokens.radius).length,
          shadow: Object.keys(tokens.shadow).length,
          spacing: Object.keys(tokens.spacing).length,
          components: components.length,
        },
        steps: result.steps,
      });
    } catch (e) {
      console.error("[pixso/sync]", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/pixso/snapshot", (_req, res) => res.json(snap.read()));
  app.get("/api/pixso/snapshot/summary", (_req, res) => res.json(buildHarmonySnapshotSummary()));
  app.get("/api/pixso/tokens",   (_req, res) => res.json(snap.read().tokens));
  app.get("/api/pixso/components", (_req, res) => res.json(snap.read().components));
}

// ───────── helpers ─────────
function countItems(x) {
  const arr = listOf(x);
  if (arr.length) return arr.length;
  return x && typeof x === "object" ? Object.keys(x).length : 0;
}
function listOf(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray(x.items)) return x.items;
  if (Array.isArray(x.styles)) return x.styles;
  if (Array.isArray(x.variables)) return x.variables;
  if (Array.isArray(x.variableSets)) return x.variableSets;
  if (Array.isArray(x.variable_sets)) return x.variable_sets;
  if (Array.isArray(x.collections)) return x.collections;
  if (Array.isArray(x.componentSets)) return x.componentSets;
  if (Array.isArray(x.component_sets)) return x.component_sets;
  if (Array.isArray(x.variants)) return x.variants;
  return [];
}
function normalizeComponents(variants) {
  if (!variants) return [];
  const list = Array.isArray(variants) ? variants
              : Array.isArray(variants.items) ? variants.items
              : Array.isArray(variants.componentSets) ? variants.componentSets
              : [];
  return list.map((v) => ({
    id: v.id || v.key || v.componentSetKey || null,
    name: v.name || "",
    page: v.pageName || v.page || null,
    variants: Array.isArray(v.variants) ? v.variants.map((it) => it.name || it).filter(Boolean) : [],
    code: { html: null, arkui: null }, // 由 inspect 调 get_code 后再补
  }));
}

module.exports = { registerRoutes };
