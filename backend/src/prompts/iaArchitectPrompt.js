"use strict";

// ══════════════════════════════════════════════════════════════════════════════
// 渐进式宏观架构 — 5 阶段 IA 状态机提示词
// Phase 1: 角色边界  Phase 2: 一级模块  Phase 3: 模块展开
// Phase 4: 流转路径  Phase 5: 架构结算
// ══════════════════════════════════════════════════════════════════════════════

const IA_SYSTEM_PROMPT =
  "你是一个专为服务于UI设计的渐进式宏观架构专家。" +
  "你的任务是根据产品描述，逐步推导系统的全局信息架构（IA）树和核心流转路径。" +
  "严格遵循渐进披露原则——按层级逐级构建（角色→模块→页面→流程），绝不跳级。" +
  "严格遵循架构扁平化原则——业务上相对独立的模块必须设为平级入口，绝不主观臆断嵌套。" +
  "只输出JSON，不要输出JSON以外的任何文本。";

/**
 * 统一构建产品上下文描述。
 * 同时支持结构化模板数据和原始种子意图。
 */
function buildProductContext(templateData, seedIntent) {
  const td = templateData || {};
  if (seedIntent) {
    return `产品意图：${seedIntent}\n（以下为 AI 提取的结构化信息，仅供参考）\n` +
      `目标用户：${td.target || "待确认"}，使用场景：${td.scene || "待确认"}，` +
      `核心任务：${td.task || "待确认"}，解决问题：${td.problem || "待确认"}。\n` +
      `用户类型：${td.userType || "待确认"}，主要需求：${td.needs || "待确认"}。`;
  }
  return [
    `产品描述：面向${td.target}，在${td.scene}场景下完成${td.task}，解决${td.problem}。`,
    `用户类型：${td.userType}，主要需求：${td.needs}。`,
    `首要任务：${td.primaryTask}，次要需求：${td.secondary}。`,
  ].join("\n");
}

/**
 * Phase 1: 核心边界与角色
 * 输入: 产品描述（种子意图或模板数据）
 * 输出: 3-5 个推断的用户角色
 */
function buildPhase1Prompt(templateData, seedIntent) {
  const context = buildProductContext(templateData, seedIntent);

  return (
    `根据以下产品描述，推断该系统可能涉及的 3-5 种核心用户角色。\n\n` +
    `${context}\n\n` +
    `要求：\n` +
    `1. 每个角色需要有明确的身份标签和职责描述\n` +
    `2. 角色之间应有明确的职责边界\n` +
    `3. 考虑系统管理、内容消费、内容生产等不同维度\n` +
    `4. 如果产品面向单一用户群（如个人工具），也要区分"普通用户"和"高级用户"等权限层级\n\n` +
    `只输出JSON：\n` +
    `{"roles":[{"id":"role_1","label":"角色名称","description":"角色职责描述（15-25字）","recommended":true}]}`
  );
}

/**
 * Phase 2: 全局一级模块
 * 输入: 产品描述 + 已确认角色
 * 输出: 独立的一级功能模块（平级入口）
 */
function buildPhase2Prompt(templateData, confirmedRoles, seedIntent) {
  const context = buildProductContext(templateData, seedIntent) +
    `\n已确认角色：${confirmedRoles.map((r) => `${r.label}（${r.description}）`).join("、")}`;

  return (
    `根据以下产品信息和已确认的用户角色，推断系统需要哪些独立的一级功能模块（平级入口）。\n\n` +
    `${context}\n\n` +
    `要求：\n` +
    `1. 模块必须是业务上相对独立的功能域\n` +
    `2. 不同角色可能共用某些模块，也可能有专属模块\n` +
    `3. 严禁将平级模块设为父子嵌套关系（例如"成员管理"和"权限管理"必须平级）\n` +
    `4. 每个模块需标注哪些角色会使用它\n` +
    `5. 推荐 5-10 个模块，覆盖产品核心功能和基础能力\n\n` +
    `只输出JSON：\n` +
    `{"modules":[{"id":"mod_1","label":"模块名称","description":"模块功能简述（15-25字）","roles":["role_1"],"recommended":true}]}`
  );
}

/**
 * Phase 3: 模块局部展开
 * 输入: 产品描述 + 角色 + 当前模块信息
 * 输出: 该模块下的二级页面节点
 */
function buildPhase3Prompt(templateData, confirmedRoles, confirmedModules, currentModule, seedIntent) {
  const context = buildProductContext(templateData, seedIntent) + "\n" + [
    `已确认角色：${confirmedRoles.map((r) => r.label).join("、")}`,
    `所有一级模块：${confirmedModules.map((m) => m.label).join("、")}`,
    `\n当前展开的模块：【${currentModule.label}】— ${currentModule.description}`,
    `该模块的使用角色：${(currentModule.roles || []).join("、")}`,
  ].join("\n");

  return (
    `为以下一级模块推断其包含的二级页面或核心功能节点。\n\n` +
    `${context}\n\n` +
    `要求：\n` +
    `1. 每个二级页面是一个独立的可访问页面（列表页、详情页、表单页、看板页等）\n` +
    `2. 页面数量适中（2-5个），避免过度拆分\n` +
    `3. 每个页面附带 3-5 个核心功能点\n` +
    `4. 考虑该模块在实际App中的常见交互模式\n\n` +
    `只输出JSON：\n` +
    `{"pages":[{"id":"page_1","label":"页面名称","description":"页面用途描述（10-20字）","features":["功能点1","功能点2","功能点3"],"recommended":true}]}`
  );
}

/**
 * Phase 4: 核心流转路径
 * 输入: 全部已确认的角色 + 模块 + 页面
 * 输出: 1-3 条黄金流转路径（User Story 格式）
 */
function buildPhase4Prompt(templateData, confirmedRoles, confirmedModules, modulePages, seedIntent) {
  const pageList = [];
  for (const mod of confirmedModules) {
    const pages = modulePages[mod.id] || [];
    for (const p of pages) {
      pageList.push(`${mod.label} / ${p.label}`);
    }
  }

  const context = buildProductContext(templateData, seedIntent) + "\n" + [
    `已确认角色：${confirmedRoles.map((r) => `${r.label}（${r.description}）`).join("、")}`,
    `\n已确认页面节点：\n${pageList.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`,
  ].join("\n");

  return (
    `基于已确认的角色和页面节点，为核心 User Story 推断出 1-3 条"黄金流转路径"。\n\n` +
    `${context}\n\n` +
    `要求：\n` +
    `1. 每条路径使用 User Story 格式：作为【角色】，我想要【目标】，以便【收益】\n` +
    `2. 明确标注页面间的跳转顺序\n` +
    `3. 标注页面间携带的核心数据\n` +
    `4. 路径应覆盖产品最核心的业务场景\n` +
    `5. 不同路径优先覆盖不同角色\n\n` +
    `只输出JSON：\n` +
    `{"flows":[{"id":"flow_1","story":"作为【角色】，我想要【目标】，以便【收益】","path":["页面A","页面B","页面C"],"data_carried":["数据1","数据2"],"recommended":true}]}`
  );
}

/**
 * Phase 5: 架构结算 — 生成最终 PRD markdown
 * 输入: 所有已确认的数据
 * 输出: 完整的 markdown PRD 文档正文
 */
function buildPhase5PrdPrompt(templateData, confirmedRoles, confirmedModules, modulePages, confirmedFlows, seedIntent) {
  const td = templateData;

  const roleText = confirmedRoles
    .map((r) => `- **${r.label}**：${r.description}`)
    .join("\n");

  const iaText = [];
  for (const mod of confirmedModules) {
    iaText.push(`### ${mod.label}`);
    iaText.push(`${mod.description}（使用角色：${(mod.roles || []).join("、")}）`);
    const pages = modulePages[mod.id] || [];
    for (const p of pages) {
      iaText.push(`- **${p.label}**：${p.description}`);
      if (p.features?.length) {
        for (const f of p.features) {
          iaText.push(`  - ${f}`);
        }
      }
    }
  }

  const flowText = (confirmedFlows || [])
    .map((f, i) => `${i + 1}. ${f.story}\n   路径：${f.path.join(" → ")}\n   携带数据：${f.data_carried.join("、")}`)
    .join("\n\n");

  return (
    `根据以下已确认的产品架构信息，生成 PRD 文档中各版块的内容。\n\n` +
    `${buildProductContext(td, seedIntent)}\n\n` +
    `## 角色\n${roleText}\n\n` +
    `## 信息架构\n${iaText.join("\n")}\n\n` +
    `## 流转路径\n${flowText}\n\n` +
    `请为PRD的以下4个版块分别生成专业内容（每版块3-6行）：\n` +
    `1. role_permission：角色与权限——描述各角色的权限范围、数据可见性\n` +
    `2. ia_structure：信息架构——描述模块划分依据、平级/嵌套关系决策理由\n` +
    `3. core_flows：核心流转路径——为每条路径补充交互细节、异常分支\n` +
    `4. basic_capabilities：基础能力——登录注册、搜索、通知等通用能力\n\n` +
    `只输出JSON：\n` +
    `{"role_permission":"内容","ia_structure":"内容","core_flows":"内容","basic_capabilities":"内容"}`
  );
}

/**
 * 构建 ia_topology 结构化数据
 */
function buildIaTopology(systemName, confirmedModules, modulePages, confirmedFlows) {
  const nodes = confirmedModules.map((mod, i) => ({
    id: `node_${i + 1}`,
    name: mod.label,
    level: 1,
    is_independent_entry: true,
    children_pages: (modulePages[mod.id] || []).map((p) => p.label),
  }));

  const coreFlows = (confirmedFlows || []).map((f, i) => ({
    flow_id: `journey_${i + 1}`,
    story: f.story,
    path: f.path,
    data_carried: f.data_carried,
  }));

  return {
    root_name: systemName || "System",
    nodes,
    core_flows: coreFlows,
  };
}

/**
 * 从已确认数据构建页面清单（与下游 lists/generate 格式兼容）
 * 输出: { categories: [{ name, pages: [{ name, features }] }] }
 */
function buildPageListFromIA(confirmedModules, modulePages) {
  const categories = [];
  for (const mod of confirmedModules) {
    const pages = modulePages[mod.id] || [];
    if (pages.length === 0) continue;
    categories.push({
      name: mod.label,
      pages: pages.map((p) => ({
        name: p.label,
        features: p.features || [],
      })),
    });
  }
  return { categories };
}

module.exports = {
  IA_SYSTEM_PROMPT,
  buildPhase1Prompt,
  buildPhase2Prompt,
  buildPhase3Prompt,
  buildPhase4Prompt,
  buildPhase5PrdPrompt,
  buildIaTopology,
  buildPageListFromIA,
};
