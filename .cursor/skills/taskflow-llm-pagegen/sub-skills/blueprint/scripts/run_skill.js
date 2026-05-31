#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const SKILL_ROOT = path.resolve(__dirname, '..');

function readTextIfExists(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function loadDotEnv(file) {
  const text = readTextIfExists(file);
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] == null) process.env[m[1]] = v;
  }
}

function stripThink(s) {
  return String(s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function extractJSON(raw) {
  let text = stripThink(raw);
  const md = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (md) text = md[1].trim();
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (m) text = m[0];
  try {
    return JSON.parse(text);
  } catch (err) {
    const repaired = text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
    return JSON.parse(repaired);
  }
}

async function callQwen({ system, user, model }) {
  loadDotEnv(path.join(ROOT, 'backend', '.env'));
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseUrl = (process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
  if (!apiKey) throw new Error('Missing DASHSCOPE_API_KEY or OPENAI_API_KEY.');
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.35,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
        }),
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 1000)}`);
      const json = JSON.parse(body);
      return stripThink(json.choices?.[0]?.message?.content || '');
    } catch (err) {
      lastErr = err;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }
  }
  throw lastErr;
}

function clip(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  const half = Math.floor(n / 2);
  return s.slice(0, half) + '\n\n<!-- clipped -->\n\n' + s.slice(-half);
}

function briefPath(sourceDir, opts = {}) {
  if (opts.inputPath) return path.resolve(ROOT, opts.inputPath);
  return fs.existsSync(path.join(sourceDir, 'input.txt')) ? path.join(sourceDir, 'input.txt') : path.join(sourceDir, '1.md');
}

function readBrief(sourceDir, opts = {}) {
  return readTextIfExists(briefPath(sourceDir, opts)).trim();
}

function loadSkillDocs() {
  const files = [
    ['top', 'SKILL.md'],
    ['user_story', 'sub-skills/user-story/SKILL.md'],
    ['state_enumeration', 'sub-skills/state-enumeration/SKILL.md'],
    ['implementation_plan', 'sub-skills/implementation-plan/SKILL.md'],
    ['blueprint_builder', 'sub-skills/blueprint-builder/SKILL.md'],
  ];
  return files.map(([name, rel]) => `\n===== PROMPT: ${name} (${rel}) =====\n${readTextIfExists(path.join(SKILL_ROOT, rel))}`).join('\n');
}

function validateBlueprint(bp) {
  const issues = [];
  if (!bp || typeof bp !== 'object') issues.push('blueprint is not object');
  if (!bp.meta || typeof bp.meta !== 'object') issues.push('missing meta');
  for (const k of ['title', 'slug', 'user_story', 'platform']) if (!bp.meta?.[k]) issues.push(`missing meta.${k}`);
  if (!Array.isArray(bp.states) || bp.states.length < 3) issues.push('states length < 3');
  if (Array.isArray(bp.states)) {
    const seen = new Set();
    bp.states.forEach((st, idx) => {
      if (typeof st.state_id !== 'number') issues.push(`state[${idx}] state_id not number`);
      if (seen.has(st.state_id)) issues.push(`duplicate state_id ${st.state_id}`);
      seen.add(st.state_id);
      for (const k of ['state_name', 'description', 'implementation_method']) if (!st[k]) issues.push(`state_${st.state_id || idx}.missing ${k}`);
      if (/\u5931\u8d25|\u5f02\u5e38|\u53d6\u6d88|\u91cd\u8bd5|\u8fd4\u56de/.test(String(st.state_name || ''))) {
        issues.push(`state_${st.state_id || idx}.non_happy_path state_name`);
      }
      if (idx === 0 && st.last_state !== null) issues.push('state_1 last_state must be null');
      if (idx > 0) {
        if (typeof st.last_state !== 'number') issues.push(`state_${st.state_id}.last_state not number`);
        if (!String(st.implementation_method || '').includes('\u57fa\u4e8e last_state')) issues.push(`state_${st.state_id}.implementation_method missing base phrase`);
        if (!String(st.implementation_method || '').includes('\u4fdd\u7559')) issues.push(`state_${st.state_id}.implementation_method missing keep phrase`);
        if (!String(st.implementation_method || '').includes('\u5220\u9664')) issues.push(`state_${st.state_id}.implementation_method missing delete phrase`);
        if (!String(st.implementation_method || '').includes('\u65b0\u589e')) issues.push(`state_${st.state_id}.implementation_method missing add phrase`);
      }
    });
  }
  return issues;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function parseStateId(text) {
  const m = String(text || '').match(/state[_\s-]*(\d+)|state_id\s*[:：]\s*(\d+)/i);
  if (!m) return null;
  return Number(m[1] || m[2]);
}

function cleanLabel(text) {
  return String(text || '').replace(/^state[_\s-]*\d+(?:::[A-Za-z0-9_-]+)?\s*[:：]\s*/i, '').trim();
}

function splitNameDesc(text) {
  const s = cleanLabel(text);
  const parts = s.split(/\s*[·。:：]\s*/).filter(Boolean);
  return {
    name: (parts[0] || s || '\u72b6\u6001').slice(0, 18),
    desc: (parts.slice(1).join('\u3002') || s || '\u5f53\u524d\u4efb\u52a1\u6d41\u72b6\u6001').slice(0, 120),
  };
}

function defaultImplementation(st, prevId) {
  if (st.state_id === 1) return '\u539f\u59cb HTML \u521d\u59cb\u5feb\u7167\uff0c\u4e0d\u505a\u6539\u9020';
  const base = prevId || Math.max(1, st.state_id - 1);
  return `\u57fa\u4e8e last_state=state_${base}\uff1a\u4fdd\u7559\uff1a\u4e0e\u4e0a\u4e00\u4e2a\u72b6\u6001\u4e00\u81f4\u7684\u9875\u9762\u9aa8\u67b6\u3001\u72b6\u6001\u680f\u548c\u5bfc\u822a\u7ed3\u6784\uff1b\u5220\u9664\uff1a\u4e0e\u5f53\u524d\u72b6\u6001\u4e0d\u76f8\u5173\u7684\u4e34\u65f6\u5c42\uff0c\u82e5\u65e0\u5219\u4e3a\u65e0\uff1b\u65b0\u589e\uff1a${st.description || st.state_name || '\u5f53\u524d\u72b6\u6001\u6240\u9700 UI'}\u3002`;
}

function shortStateName(text, idx) {
  const s = String(text || '').replace(/^用户在[^→，,]*[点点击]+/, '').replace(/^点[击]?/, '').trim();
  if (idx === 1) return '\u521d\u59cb\u9875\u9762\u72b6\u6001';
  if (/\u5f39\u7a97/.test(s)) return /\u521b\u5efa\u5f00\u5c40/.test(s) ? '\u521b\u5efa\u5f00\u5c40\u5f39\u7a97' : '\u5f39\u7a97\u72b6\u6001';
  if (/\u914d\u7f6e\u9875|\u5168\u5c4f\u9875|\u8be6\u60c5\u9875/.test(s)) return (s.match(/[\u4e00-\u9fa5A-Za-z0-9-]*(?:\u914d\u7f6e\u9875|\u5168\u5c4f\u9875|\u8be6\u60c5\u9875)/) || [])[0] || '\u9875\u9762\u72b6\u6001';
  if (/\u6210\u529f|Toast|toast/.test(s)) return '\u6210\u529f\u63d0\u793a\u72b6\u6001';
  if (/loading|\u52a0\u8f7d|\u63d0\u4ea4/.test(s)) return '\u63d0\u4ea4\u4e2d\u72b6\u6001';
  return splitNameDesc(s).name;
}

function fallbackBlueprintFromBrief(blueprint, brief) {
  const parts = String(brief || '').split(/\s*→\s*/).map(s => s.trim()).filter(Boolean);
  const useful = parts.filter((part, idx) => idx === 0 || !/\u53d6\u6d88|\u5931\u8d25|\u5f02\u5e38|\u91cd\u8bd5|\u8fd4\u56de/.test(part));
  if (useful.length < 3) return null;
  const states = useful.map((part, idx) => {
    const id = idx + 1;
    const state = {
      state_id: id,
      state_name: shortStateName(part, id),
      description: id === 1 ? '\u4fdd\u6301\u4efb\u52a1\u5165\u53e3\u6240\u5728\u9875\u9762\u7684\u539f\u59cb\u89c6\u89c9' : part.slice(0, 120),
      implementation_method: '',
      last_state: id === 1 ? null : id - 1,
    };
    state.implementation_method = defaultImplementation(state, state.last_state);
    return state;
  });
  return {
    meta: blueprint?.meta || {
      title: '\u4efb\u52a1\u6d41\u84dd\u56fe',
      slug: 'taskflow-blueprint',
      user_story: parts.join('，'),
      platform: 'mobile',
    },
    states,
  };
}

function normalizeAcceptanceCriteria(value) {
  const criteria = Array.isArray(value) ? value : [];
  if (criteria.length && criteria.every(item => item && typeof item === 'object' && item.type && item.text)) {
    return [{
      scenario: 'happy path 完成任务流',
      steps: criteria.map(step => ({
        type: String(step.type || '').toLowerCase(),
        text: String(step.text || ''),
      })).filter(step => step.type && step.text),
    }];
  }
  return criteria.map((item) => {
    const next = { ...(item && typeof item === 'object' ? item : { scenario: String(item || '') }) };
    if (next.type && next.text && (!Array.isArray(next.steps) || !next.steps.length)) {
      return {
        scenario: next.scenario || 'happy path 完成任务流',
        steps: [{ type: String(next.type).toLowerCase(), text: String(next.text) }],
      };
    }
    if (Array.isArray(next.steps)) return next;
    if (typeof next.steps === 'string') {
      const raw = next.steps.trim();
      try {
        const parsed = JSON.parse(raw.startsWith('[') ? raw : `[${raw}]`);
        if (Array.isArray(parsed)) {
          next.steps = parsed
            .filter(step => step && typeof step === 'object')
            .map(step => ({
              type: String(step.type || '').toLowerCase(),
              text: String(step.text || ''),
            }))
            .filter(step => step.type && step.text);
          return next;
        }
      } catch {}
    }
    const grouped = [];
    for (const type of ['given', 'when', 'then', 'and', 'but']) {
      const arr = Array.isArray(next[type]) ? next[type] : (next[type] ? [next[type]] : []);
      for (const text of arr) grouped.push({ type, text: String(text) });
      delete next[type];
    }
    next.steps = grouped;
    return next;
  });
}

function normalizeUserStoryPhase(parsed) {
  const next = cloneJson(parsed);
  if (Array.isArray(next.acceptance_criteria_steps)) {
    next.acceptance_criteria_steps = next.acceptance_criteria_steps
      .filter(step => step && typeof step === 'object')
      .map(step => ({
        type: String(step.type || '').toLowerCase(),
        text: String(step.text || ''),
      }))
      .filter(step => step.type && step.text);
  } else {
    const normalized = normalizeAcceptanceCriteria(next.acceptance_criteria);
    next.acceptance_criteria_steps = normalized.flatMap(item => Array.isArray(item.steps) ? item.steps : []);
  }
  delete next.acceptance_criteria;
  if (!next.platform) next.platform = 'mobile';
  if (!next.user_story && next.actor && next.trigger && next.happy_path && next.success_criteria) {
    const context = next.context ? `在${next.context}中，` : '';
    next.user_story = `作为${next.actor}，${context}当${next.trigger}时，我希望能${next.happy_path}，直到${next.success_criteria}为止。`;
  }
  return next;
}

function parseStateObjectFromText(text, idx) {
  const s = String(text || '');
  const id = parseStateId(s) || idx + 1;
  const nameMatch = s.match(/state_name\s*[:：]\s*([^,\n]+)/i);
  const descMatch = s.match(/description\s*[:：]\s*([^,\n]+(?:[^]*?)(?=,\s*implementation_method|,\s*last_state|$))/i);
  const implMatch = s.match(/implementation_method\s*[:：]\s*([^]*?)(?=,\s*last_state|$)/i);
  const lastMatch = s.match(/last_state\s*[:：]\s*(null|\d+)/i);
  const nd = splitNameDesc(s);
  const st = {
    state_id: id,
    state_name: (nameMatch ? nameMatch[1] : nd.name).trim(),
    description: (descMatch ? descMatch[1] : nd.desc).trim(),
    implementation_method: (implMatch ? implMatch[1] : '').trim(),
    last_state: id === 1 ? null : (lastMatch ? Number(lastMatch[1]) : id - 1),
  };
  if (lastMatch && lastMatch[1] === 'null') st.last_state = null;
  return st;
}

function parseStatesFromStrings(values) {
  if (!Array.isArray(values) || !values.length || !values.every(v => typeof v === 'string')) return [];
  const joinedFieldNames = values.join('|').toLowerCase();
  if (joinedFieldNames === 'state_id|state_name|description|implementation_method|last_state') return [];

  const oneLineObjects = values.filter(s => /state_id\s*[:：]\s*\d+/i.test(s) && /state_name\s*[:：]/i.test(s));
  if (oneLineObjects.length) return oneLineObjects.map(parseStateObjectFromText);

  const chunked = [];
  let cur = null;
  for (const raw of values) {
    const s = String(raw || '').trim();
    const id = s.match(/^state_id\s*[:：]\s*(\d+)/i);
    if (id) {
      if (cur) chunked.push(cur);
      cur = { state_id: Number(id[1]) };
      continue;
    }
    if (!cur && /^state[_-]?\d+/i.test(s)) continue;
    if (!cur && /state_name|description|implementation_method|last_state/i.test(s)) cur = {};
    if (!cur) continue;
    let m;
    if ((m = s.match(/^state_name\s*[:：]\s*(.*)$/i))) cur.state_name = m[1].trim();
    else if ((m = s.match(/^description\s*[:：]\s*(.*)$/i))) cur.description = m[1].trim();
    else if ((m = s.match(/^implementation_method\s*[:：]\s*(.*)$/i))) cur.implementation_method = m[1].trim();
    else if ((m = s.match(/^last_state\s*[:：]\s*(null|\d+)/i))) cur.last_state = m[1] === 'null' ? null : Number(m[1]);
  }
  if (cur) chunked.push(cur);
  if (chunked.length) return chunked.map((st, idx) => ({
    state_id: Number(st.state_id || idx + 1),
    state_name: st.state_name || `state_${idx + 1}`,
    description: st.description || st.state_name || `state_${idx + 1}`,
    implementation_method: st.implementation_method || defaultImplementation({ ...st, state_id: Number(st.state_id || idx + 1) }, idx),
    last_state: Number(st.state_id || idx + 1) === 1 ? null : (typeof st.last_state === 'number' ? st.last_state : Number(st.state_id || idx + 1) - 1),
  }));

  const rich = values
    .filter(s => /state[_\s-]*\d+|state_id\s*[:：]\s*\d+/i.test(s))
    .map(parseStateObjectFromText);
  if (rich.length) return rich;
  return [];
}

function statesFromIntermediate(parsed) {
  const confirmed = parsed?.intermediate?.confirmed_states || parsed?.intermediate?.states;
  if (!Array.isArray(confirmed)) return [];
  const impls = parsed?.intermediate?.implementations_confirmed || parsed?.intermediate?.implementations || {};
  return confirmed.map((item, idx) => {
    const text = typeof item === 'object' && item ? (item.label || item.state_name || item.description || JSON.stringify(item)) : item;
    const id = parseStateId(item?.id || text) || idx + 1;
    const nd = splitNameDesc(text);
    let implText = '';
    if (Array.isArray(impls)) {
      implText = impls.find(x => String(x || '').startsWith(`state_${id}::`)) || impls[idx] || '';
    } else if (impls && typeof impls === 'object') {
      implText = impls[`state_${id}`] || impls[id] || '';
    }
    return {
      state_id: id,
      state_name: nd.name,
      description: nd.desc,
      implementation_method: implText ? defaultImplementation({ state_id: id, state_name: nd.name, description: cleanLabel(implText) }, id - 1) : '',
      last_state: id === 1 ? null : id - 1,
    };
  });
}

function isPlaceholderState(st) {
  const name = String(st?.state_name || '').trim();
  const desc = String(st?.description || '').trim();
  return /^state[_\s-]*\d+$/i.test(name) && (!desc || desc === name || /^state[_\s-]*\d+$/i.test(desc));
}

function hasUsefulStates(states) {
  return Array.isArray(states) && states.length >= 3 && states.some(st => !isPlaceholderState(st));
}

function coerceBlueprintShape(blueprint, parsed) {
  const bp = cloneJson(blueprint);
  if (!bp.meta && parsed?.blueprint?.meta) bp.meta = parsed.blueprint.meta;
  if (!Array.isArray(bp.states)) return bp;
  if (bp.states.every(st => st && typeof st === 'object' && !Array.isArray(st))) return bp;

  let states = parseStatesFromStrings(bp.states);
  const intermediateStates = statesFromIntermediate(parsed);
  if (!hasUsefulStates(states) && hasUsefulStates(intermediateStates)) states = intermediateStates;
  if (!states.length) return bp;

  bp.states = states.map((st, idx) => {
    const id = Number(st.state_id || idx + 1);
    const next = {
      state_id: id,
      state_name: st.state_name || `state_${id}`,
      description: st.description || st.state_name || `state_${id}`,
      implementation_method: st.implementation_method || '',
      last_state: id === 1 ? null : (typeof st.last_state === 'number' ? st.last_state : id - 1),
    };
    if (!next.implementation_method) next.implementation_method = defaultImplementation(next, next.last_state);
    return next;
  });
  return bp;
}

async function writeStageOutputs(outDir, { parsed, blueprint, issues, repaired, fallback }) {
  const stageDir = path.join(outDir, 'stages');
  await fsp.mkdir(stageDir, { recursive: true });
  const intermediate = parsed?.intermediate || {};
  const phase2States = intermediate.confirmed_states || intermediate.states || intermediate.state_enumeration || null;
  const phase3Implementations = intermediate.implementations_confirmed || intermediate.implementations || intermediate.implementation_plan || null;
  const stages = [
    ['phase1_user_story.json', intermediate.user_story || null],
    ['phase2_state_enumeration.json', phase2States],
    ['phase3_implementation_plan.json', phase3Implementations],
    ['phase4_blueprint_builder.json', parsed?.blueprint || parsed || null],
    ['phase4_blueprint_normalized.json', blueprint || null],
    ['validation_report.json', { issues, states: blueprint?.states?.length || 0 }],
  ];
  if (repaired) stages.push(['repair_response.json', repaired.parsed || repaired]);
  if (fallback) stages.push(['fallback_from_brief.json', fallback]);
  for (const [name, data] of stages) {
    await fsp.writeFile(path.join(stageDir, name), JSON.stringify(data, null, 2), 'utf8');
  }
  await fsp.writeFile(path.join(stageDir, 'stage_manifest.json'), JSON.stringify({
    files: stages.map(([name]) => name),
  }, null, 2), 'utf8');
}

function isPlaceholderText(text) {
  return /^state[_\s-]*\d+$/i.test(String(text || '').trim());
}

function validateStageOutputs(parsed) {
  const issues = [];
  const intermediate = parsed?.intermediate || {};
  const story = intermediate.user_story || parsed?.blueprint?.meta?.user_story || parsed?.meta?.user_story;
  const states = intermediate.confirmed_states || intermediate.states || intermediate.state_enumeration;
  const impls = intermediate.implementations_confirmed || intermediate.implementations || intermediate.implementation_plan;
  if (!story || (typeof story !== 'object' && typeof story !== 'string')) issues.push('phase1 user_story missing');
  if (!Array.isArray(states) || states.length < 3) {
    issues.push('phase2 states missing or length < 3');
  } else {
    states.forEach((state, idx) => {
      const label = typeof state === 'object' && state ? (state.label || state.state_name || state.description || state.id) : state;
      if (isPlaceholderText(label)) issues.push(`phase2 state_${idx + 1} placeholder`);
      const stateName = splitNameDesc(label).name;
      if (/\u5931\u8d25|\u5f02\u5e38|\u53d6\u6d88|\u91cd\u8bd5|\u8fd4\u56de/.test(String(stateName || ''))) {
        issues.push(`phase2 state_${idx + 1} non_happy_path`);
      }
    });
  }
  const implCount = Array.isArray(impls) ? impls.length : (impls && typeof impls === 'object' ? Object.keys(impls).length : 0);
  const expectedImpls = Array.isArray(states) ? Math.max(0, states.length - 1) : 0;
  if (expectedImpls > 0 && implCount < expectedImpls) issues.push('phase3 implementations incomplete');
  return issues;
}

async function generateBlueprintAttempt({ system, user, brief, pageDsl, skillDocs, opts }) {
  const raw = await callQwen({ system, user, model: opts.model });
  const parsed = extractJSON(raw);
  let blueprint = coerceBlueprintShape(parsed.blueprint || parsed, parsed);
  let stageIssues = validateStageOutputs(parsed);
  let blueprintIssues = validateBlueprint(blueprint);
  let issues = stageIssues.concat(blueprintIssues);
  let repaired = null;
  let fallback = null;
  if (issues.length && !opts.noRepair) {
    repaired = await repairBlueprint({ invalid: parsed, issues, brief, pageDsl, seedHtml: '', skillDocs, opts });
    repaired.blueprint = coerceBlueprintShape(repaired.blueprint, repaired.parsed);
    const repairedStageIssues = validateStageOutputs(repaired.parsed);
    const repairedBlueprintIssues = validateBlueprint(repaired.blueprint);
    const repairedIssues = repairedStageIssues.concat(repairedBlueprintIssues);
    if (repairedIssues.length <= issues.length) {
      blueprint = repaired.blueprint;
      stageIssues = repairedStageIssues;
      blueprintIssues = repairedBlueprintIssues;
      issues = repairedIssues;
    }
  }
  if (blueprintIssues.length) {
    const candidate = fallbackBlueprintFromBrief(blueprint, brief);
    if (candidate) {
      const fallbackIssues = validateBlueprint(candidate);
      if (fallbackIssues.length < blueprintIssues.length) {
        fallback = candidate;
        blueprint = candidate;
        blueprintIssues = fallbackIssues;
        issues = stageIssues.concat(blueprintIssues);
      }
    }
  }
  return { parsed, blueprint, issues, repaired, fallback };
}

async function repairBlueprint({ invalid, issues, brief, pageDsl, seedHtml, skillDocs, opts }) {
  const system = [
    'You repair one invalid taskflow blueprint.',
    'Use ONLY the supplied .cursor taskflow-blueprint skill documents as rules.',
    'Return ONLY JSON: {"action":"done","blueprint":{...}}.',
    'Critical schema rule: blueprint.states MUST be an array of objects, never an array of field names.',
    'If the invalid response contains intermediate.confirmed_states or intermediate.implementations_confirmed, expand them into blueprint.states objects.',
    'Do NOT return ["state_1","state_2"] or ["state_id","state_name",...].',
    'Each state object MUST contain numeric state_id, state_name, description, implementation_method, last_state.',
    'For every state after state_1, implementation_method MUST include these exact Chinese section words:',
    '"\u57fa\u4e8e last_state=state_X", "\u4fdd\u7559", "\u5220\u9664", "\u65b0\u589e".',
    skillDocs,
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Repair invalid blueprint JSON only. Do not generate HTML code.',
    issues,
    invalid_full_response: invalid,
    brief,
    page_dsl: clip(pageDsl, 12000),
    seed_html: clip(seedHtml, 4000),
    required_shape_example: {
      action: 'done',
      blueprint: {
        meta: {
          title: '...',
          slug: 'ascii-slug',
          user_story: '...',
          platform: 'mobile'
        },
        states: [
          {
            state_id: 1,
            state_name: '...',
            description: '...',
            implementation_method: '\u539f\u59cb HTML \u521d\u59cb\u5feb\u7167\uff0c\u4e0d\u505a\u6539\u9020',
            last_state: null
          },
          {
            state_id: 2,
            state_name: '...',
            description: '...',
            implementation_method: '\u57fa\u4e8e last_state=state_1\uff1a\u4fdd\u7559\uff1a...\uff1b\u5220\u9664\uff1a...\uff1b\u65b0\u589e\uff1a...\u3002',
            last_state: 1
          }
        ]
      }
    }
  }, null, 2);
  const raw = await callQwen({ system, user, model: opts.model });
  const parsed = extractJSON(raw);
  return { parsed, blueprint: parsed.blueprint || parsed };
}

async function runBlueprint(testDir, opts) {
  const sourceDir = path.resolve(ROOT, testDir);
  const brief = readBrief(sourceDir, opts);
  const pageDsl = readTextIfExists(path.join(sourceDir, 'spec.json')).trim() || readTextIfExists(path.join(sourceDir, 'wps_doc_0.dsl.json')).trim();
  if (!brief) throw new Error(`Missing brief: ${sourceDir}`);
  if (!pageDsl) throw new Error(`Missing spec.json/page DSL: ${sourceDir}`);

  const skillDocs = loadSkillDocs();
  const system = [
    'You are a strict taskflow blueprint runner.',
    'You MUST follow the provided .cursor skill documents as the only workflow specification.',
    'Do not use or mention any legacy workflow scripts.',
    'Use the four taskflow-blueprint sub-skills internally in order: user-story, state-enumeration, implementation-plan, blueprint-builder.',
    'Auto-select the default/best option at each ask phase; do not ask the user interactively.',
    'Return ONLY JSON: {"action":"done","blueprint":{...},"intermediate":{...}}.',
    'Hard rule: blueprint.states must be an array of objects. Never return an array of strings.',
    'Hard rule: never return states like ["state_1"] or ["state_id: 1"].',
    'Hard rule: happy-path only. If the brief includes both success and failure outcomes, keep the success branch and exclude failure/retry/cancel/return states.',
    'The final blueprint must satisfy the blueprint-builder schema and quality checklist.',
    `Model requested by user: ${opts.model}.`,
    skillDocs,
  ].join('\n\n');

  const buildUser = (retryContext = null) => JSON.stringify({
    task: 'Generate taskflow blueprint only. Stop after blueprint.json. Do not generate HTML code.',
    source_dir: testDir,
    brief,
    page_dsl: clip(pageDsl, 18000),
    retry_context: retryContext,
    output_requirements: {
      action: 'done',
      blueprint_schema_note: 'blueprint.states must be an array of state objects, not a list of field names.',
      forbidden_states_examples: [
        ['state_1', 'state_2'],
        ['state_id', 'state_name', 'description', 'implementation_method', 'last_state'],
        ['state_id: 1', 'state_name: ...']
      ],
      required_states_example: [
        {
          state_id: 1,
          state_name: '...',
          description: '...',
          implementation_method: '\u539f\u59cb HTML \u521d\u59cb\u5feb\u7167\uff0c\u4e0d\u505a\u6539\u9020',
          last_state: null
        },
        {
          state_id: 2,
          state_name: '...',
          description: '...',
          implementation_method: '\u57fa\u4e8e last_state=state_1\uff1a\u4fdd\u7559\uff1a...\uff1b\u5220\u9664\uff1a...\uff1b\u65b0\u589e\uff1a...\u3002',
          last_state: 1
        }
      ],
      state_object_required_keys: ['state_id', 'state_name', 'description', 'implementation_method', 'last_state'],
      implementation_method_required_words: ['\u57fa\u4e8e last_state', '\u4fdd\u7559', '\u5220\u9664', '\u65b0\u589e'],
      language: 'Chinese for user-facing fields',
    },
  }, null, 2);

  const maxRetries = Math.max(0, Number(opts.maxRetries || 0));
  const attempts = [];
  let best = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const retryContext = attempt === 0 ? null : {
      attempt,
      previous_issues: best?.issues || [],
      instruction: 'Retry because validation failed. Return complete intermediate phase outputs and a valid happy-path blueprint. Do not return placeholder states like state_1/state_2.',
    };
    const result = await generateBlueprintAttempt({ system, user: buildUser(retryContext), brief, pageDsl, skillDocs, opts });
    attempts.push({ attempt: attempt + 1, issues: result.issues, states: result.blueprint?.states?.length || 0, fallback_used: Boolean(result.fallback) });
    if (!best || result.issues.length < best.issues.length) best = result;
    if (result.issues.length === 0) {
      best = result;
      break;
    }
  }
  const { parsed, blueprint, issues, repaired, fallback } = best;
  const stamp = opts.stamp;
  const outDir = path.join(sourceDir, `html`, `_run_skills_${opts.model}_${stamp}`);
  await fsp.mkdir(outDir, { recursive: true });
  await fsp.writeFile(path.join(outDir, 'raw_response.json'), JSON.stringify(parsed, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'attempts.json'), JSON.stringify(attempts, null, 2), 'utf8');
  if (repaired) await fsp.writeFile(path.join(outDir, 'repair_response.json'), JSON.stringify(repaired.parsed, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'blueprint.json'), JSON.stringify(blueprint, null, 2), 'utf8');
  await writeStageOutputs(outDir, { parsed, blueprint, issues, repaired, fallback });
  await fsp.writeFile(path.join(outDir, 'run_report.json'), JSON.stringify({ source_dir: testDir, model: opts.model, issues, states: blueprint.states?.length || 0, fallback_used: Boolean(fallback), attempts }, null, 2), 'utf8');
  return { testDir, outDir, issues, states: blueprint.states?.length || 0, title: blueprint.meta?.title || '', fallback_used: Boolean(fallback), attempts: attempts.length };
}

async function runUserStoryPhase(testDir, opts) {
  const sourceDir = path.resolve(ROOT, testDir);
  const brief = readBrief(sourceDir, opts);
  const pageDsl = readTextIfExists(path.join(sourceDir, 'spec.json')).trim() || readTextIfExists(path.join(sourceDir, 'wps_doc_0.dsl.json')).trim();
  if (!brief) throw new Error(`Missing brief: ${sourceDir}`);
  if (!pageDsl) throw new Error(`Missing spec.json/page DSL: ${sourceDir}`);

  const skillDoc = readTextIfExists(path.join(SKILL_ROOT, 'sub-skills/user-story/SKILL.md'));
  const system = [
    'You are taskflow-user-story phase runner.',
    'Follow ONLY the supplied user-story skill document.',
    'Return ONLY strict JSON, no markdown.',
    'The happy_path MUST preserve and expand all happy-path facts from the user brief. Do not summarize as generic phrases.',
    'Use Given-When-Then / BDD acceptance criteria. Include at least one happy-path scenario.',
    'The acceptance_criteria_steps field MUST be an ordered JSON array: [{"type":"given|and|when|then|but","text":"..."}]. Do NOT use grouped arrays like given:[], when:[], then:[], and:[].',
    'The acceptance_criteria_steps field MUST be a JSON array, not a string. Never stringify it.',
    'Apply INVEST as a short self-check, but do not expand into unrelated stories.',
    'Required JSON keys: actor, context, trigger, happy_path, goal, benefit, success_criteria, acceptance_criteria_steps, invest_check, user_story, platform.',
    skillDoc,
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Generate phase1 confirmed user story only. Stop after phase1.',
    source_dir: testDir,
    brief,
    page_dsl: clip(pageDsl, 12000),
    required_shape: {
      actor: '...',
      context: '...',
      trigger: '...',
      happy_path: '完整展开 brief 中的 happy path，不遗漏输入项、选择项、校验条件、提交动作和成功反馈',
      goal: '...',
      benefit: '...',
      success_criteria: '...',
      acceptance_criteria_steps: [
        { type: 'given', text: '...' },
        { type: 'and', text: '...' },
        { type: 'when', text: '...' },
        { type: 'then', text: '...' },
        { type: 'and', text: '...' },
      ],
      forbidden_acceptance_criteria_examples: [
        '{"type":"given","text":"..."},{"type":"when","text":"..."}',
        { given: ['...'], when: ['...'], then: ['...'], and: ['...'] },
        { scenario: '...', steps: [{ type: 'given', text: '...' }] },
      ],
      invest_check: {
        independent: '...',
        negotiable: '...',
        valuable: '...',
        estimable: '...',
        small: '...',
        testable: '...',
      },
      user_story: '作为...，当...时，我希望能...，直到...为止。',
      platform: 'mobile',
    },
  }, null, 2);

  const raw = await callQwen({ system, user, model: opts.model });
  const parsed = normalizeUserStoryPhase(extractJSON(raw));
  const stamp = opts.stamp;
  const outDir = path.join(sourceDir, 'html', `_run_skills_${opts.model}_${stamp}_phase1`);
  const stageDir = path.join(outDir, 'stages');
  await fsp.mkdir(stageDir, { recursive: true });
  await fsp.writeFile(path.join(outDir, 'raw_response.json'), JSON.stringify(parsed, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase1_user_story.json'), JSON.stringify(parsed, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'run_report.json'), JSON.stringify({
    source_dir: testDir,
    model: opts.model,
    phase: 'phase1_user_story',
    output: path.join(stageDir, 'phase1_user_story.json'),
  }, null, 2), 'utf8');
  return { testDir, outDir, phase: 'phase1_user_story', ok: true, user_story: parsed.user_story || '' };
}

function latestPhaseFile(sourceDir, phaseSuffix, relFile) {
  const htmlDir = path.join(sourceDir, 'html');
  const dirs = fs.readdirSync(htmlDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.includes(phaseSuffix))
    .map(d => path.join(htmlDir, d.name, relFile))
    .filter(p => fs.existsSync(p))
    .map(p => ({ path: p, mtime: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return dirs[0]?.path || '';
}

function normalizePhase2States(parsed) {
  const options = Array.isArray(parsed?.options) ? parsed.options : (Array.isArray(parsed?.states) ? parsed.states : []);
  return options.map((item, idx) => {
    if (item && typeof item === 'object') {
      return {
        id: item.id || `state_${idx + 1}`,
        label: splitNameDesc(item.label || item.state_name || `state_${idx + 1}`).name,
        description: item.description || splitNameDesc(item.label || '').desc || '',
        rationale: item.rationale || '',
      };
    }
    const text = String(item || '');
    const nd = splitNameDesc(text);
    return {
      id: `state_${idx + 1}`,
      label: nd.name,
      description: nd.desc,
      rationale: '',
    };
  });
}

async function runStateEnumerationPhase(testDir, opts) {
  const sourceDir = path.resolve(ROOT, testDir);
  const brief = readBrief(sourceDir, opts);
  const pageDsl = readTextIfExists(path.join(sourceDir, 'spec.json')).trim() || readTextIfExists(path.join(sourceDir, 'wps_doc_0.dsl.json')).trim();
  if (!brief) throw new Error(`Missing brief: ${sourceDir}`);
  if (!pageDsl) throw new Error(`Missing spec.json/page DSL: ${sourceDir}`);

  const phase1Path = latestPhaseFile(sourceDir, '_phase1', path.join('stages', 'phase1_user_story.json'));
  if (!phase1Path) throw new Error(`Missing latest phase1_user_story.json: ${sourceDir}`);
  const userStory = JSON.parse(readTextIfExists(phase1Path));
  const skillDoc = readTextIfExists(path.join(SKILL_ROOT, 'sub-skills/state-enumeration/SKILL.md'));

  const system = [
    'You are taskflow-state-enumeration phase runner.',
    'Follow ONLY the supplied state-enumeration skill document.',
    'Return ONLY strict JSON, no markdown.',
    'Generate happy-path states only. Do not include failure/cancel/retry/return states unless the user story explicitly makes them the main goal.',
    'Enumerate states from phase1 acceptance_criteria_steps in order, from start to success.',
    'For form submit/create flows, ALWAYS include separate states for: form initial, filled/submittable, submitting/loading, and submitted/success feedback. Do not merge loading with success.',
    'The output MUST be {"action":"ask","phase":2,"options":[{"id":"state_1","label":"状态简称","description":"触发条件：...\\n展示信息：...\\n继承信息：...","rationale":"..."}],"multiSelect":true}.',
    'Every label MUST be a short state name only. Do not include "·", colon, or long description in label.',
    'Every description MUST include these exact sections: 触发条件：, 展示信息：, 继承信息：.',
    skillDoc,
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Generate phase2 state enumeration only. Stop after phase2.',
    source_dir: testDir,
    phase1_user_story: userStory,
    brief,
    page_dsl: clip(pageDsl, 16000),
    required_shape: {
      action: 'ask',
      phase: 2,
      options: [
        {
          id: 'state_1',
          label: '初始页面状态',
          description: '触发条件：无，任务流起点。\n展示信息：任务入口所在页面的原始视觉。\n继承信息：无。',
          rationale: '任务流起点',
        },
        {
          id: 'state_2',
          label: '...',
          description: '触发条件：...\n展示信息：...\n继承信息：继承 state_1 的...；改变...',
          rationale: '...',
        },
      ],
      multiSelect: true,
    },
  }, null, 2);

  const raw = await callQwen({ system, user, model: opts.model });
  const parsed = extractJSON(raw);
  const states = normalizePhase2States(parsed);
  const normalized = { ...parsed, options: states };
  const stamp = opts.stamp;
  const outDir = path.join(sourceDir, 'html', `_run_skills_${opts.model}_${stamp}_phase2`);
  const stageDir = path.join(outDir, 'stages');
  await fsp.mkdir(stageDir, { recursive: true });
  await fsp.writeFile(path.join(outDir, 'raw_response.json'), JSON.stringify(parsed, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase1_user_story.json'), JSON.stringify(userStory, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase2_state_enumeration.json'), JSON.stringify(states, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'phase2_response.json'), JSON.stringify(normalized, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'run_report.json'), JSON.stringify({
    source_dir: testDir,
    model: opts.model,
    phase: 'phase2_state_enumeration',
    phase1_source: phase1Path,
    states: states.length,
    output: path.join(stageDir, 'phase2_state_enumeration.json'),
  }, null, 2), 'utf8');
  return { testDir, outDir, phase: 'phase2_state_enumeration', ok: true, states: states.length };
}

function normalizePhase3Options(parsed) {
  const options = Array.isArray(parsed?.options) ? parsed.options : (Array.isArray(parsed?.implementations) ? parsed.implementations : []);
  return options.map((item, idx) => {
    if (item && typeof item === 'object') {
      return {
        id: item.id || `state_unknown::opt_${idx + 1}`,
        implementation_plan: item.implementation_plan || item.implementationPlan || item.plan || item.label || item.description || '',
        rationale: item.rationale || '',
        group: item.group || '',
        default: Boolean(item.default),
      };
    }
    return {
      id: `state_unknown::opt_${idx + 1}`,
      implementation_plan: String(item || ''),
      rationale: '',
      group: '',
      default: false,
    };
  });
}

async function runImplementationPlanPhase(testDir, opts) {
  const sourceDir = path.resolve(ROOT, testDir);
  const brief = readBrief(sourceDir, opts);
  const pageDsl = readTextIfExists(path.join(sourceDir, 'spec.json')).trim() || readTextIfExists(path.join(sourceDir, 'wps_doc_0.dsl.json')).trim();
  if (!brief) throw new Error(`Missing brief: ${sourceDir}`);
  if (!pageDsl) throw new Error(`Missing spec.json/page DSL: ${sourceDir}`);

  const phase1Path = latestPhaseFile(sourceDir, '_phase1', path.join('stages', 'phase1_user_story.json'));
  const phase2Path = latestPhaseFile(sourceDir, '_phase2', path.join('stages', 'phase2_state_enumeration.json'));
  if (!phase1Path) throw new Error(`Missing latest phase1_user_story.json: ${sourceDir}`);
  if (!phase2Path) throw new Error(`Missing latest phase2_state_enumeration.json: ${sourceDir}`);
  const userStory = JSON.parse(readTextIfExists(phase1Path));
  const confirmedStates = JSON.parse(readTextIfExists(phase2Path));
  const skillDoc = readTextIfExists(path.join(SKILL_ROOT, 'sub-skills/implementation-plan/SKILL.md'));

  const system = [
    'You are taskflow-implementation-plan phase runner.',
    'Follow ONLY the supplied implementation-plan skill document.',
    'Return ONLY strict JSON, no markdown.',
    'Generate 2-3 implementation candidates for every non-state_1 state.',
    'Use Phase 2 state description sections (触发条件/展示信息/继承信息) to decide UI components and layout.',
    'Use Material Design intent-to-component mapping from the skill document, but do not mention implementation libraries.',
    'The output MUST be {"action":"ask","phase":3,"options":[{"id":"state_2::opt_a","implementation_plan":"...","rationale":"...","group":"state_2 · 状态名","default":true}],"multiSelect":true,"allowCustom":true}.',
    'Use implementation_plan for detailed UI implementation instructions. Do NOT use label as the implementation plan field.',
    skillDoc,
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Generate phase3 implementation plan candidates only. Stop after phase3.',
    source_dir: testDir,
    phase1_user_story: userStory,
    confirmed_states: confirmedStates,
    brief,
    page_dsl: clip(pageDsl, 16000),
    required_shape: {
      action: 'ask',
      phase: 3,
      options: [
        {
          id: 'state_2::opt_a',
          implementation_plan: '详细候选实现方案，说明组件、形式、布局、关键文案、继承关系和状态变化',
          rationale: '说明为什么适合该 state',
          group: 'state_2 · 状态名',
          default: true,
        },
      ],
      multiSelect: true,
      allowCustom: true,
    },
  }, null, 2);

  const raw = await callQwen({ system, user, model: opts.model });
  const parsed = extractJSON(raw);
  const options = normalizePhase3Options(parsed);
  const normalized = { ...parsed, options };
  const stamp = opts.stamp;
  const outDir = path.join(sourceDir, 'html', `_run_skills_${opts.model}_${stamp}_phase3`);
  const stageDir = path.join(outDir, 'stages');
  await fsp.mkdir(stageDir, { recursive: true });
  await fsp.writeFile(path.join(outDir, 'raw_response.json'), JSON.stringify(parsed, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase1_user_story.json'), JSON.stringify(userStory, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase2_state_enumeration.json'), JSON.stringify(confirmedStates, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase3_implementation_plan.json'), JSON.stringify(options, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'phase3_response.json'), JSON.stringify(normalized, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'run_report.json'), JSON.stringify({
    source_dir: testDir,
    model: opts.model,
    phase: 'phase3_implementation_plan',
    phase1_source: phase1Path,
    phase2_source: phase2Path,
    options: options.length,
    output: path.join(stageDir, 'phase3_implementation_plan.json'),
  }, null, 2), 'utf8');
  return { testDir, outDir, phase: 'phase3_implementation_plan', ok: true, options: options.length };
}

function readJsonFile(p) {
  return JSON.parse(readTextIfExists(p));
}

function parseJsonOrText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stateIdFromOption(option) {
  const fromId = String(option?.id || '').match(/^(state_\d+)::/i);
  if (fromId) return fromId[1];
  const fromGroup = String(option?.group || '').match(/^(state_\d+)\b/i);
  if (fromGroup) return fromGroup[1];
  return '';
}

function groupImplementationOptions(options) {
  const byState = new Map();
  for (const option of options) {
    const stateId = stateIdFromOption(option);
    if (!stateId) continue;
    if (!byState.has(stateId)) byState.set(stateId, []);
    byState.get(stateId).push(option);
  }
  return byState;
}

function omitKeys(obj, keys) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const drop = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !drop.has(key)));
}

function cleanConfirmedState(state) {
  return omitKeys(state, ['rationale']);
}

function cleanConfirmedImplementation(implementation) {
  if (!implementation) return null;
  const clean = omitKeys(implementation, ['id', 'label', 'rationale', 'group', 'default']);
  clean.implementation_plan = implementation.implementation_plan || implementation.implementationPlan || implementation.plan || implementation.label || implementation.description || '';
  return clean;
}

function composeMergedStatesById(states, implementationOptions) {
  const optionsByState = groupImplementationOptions(implementationOptions);
  const implementationsConfirmedById = {};
  const mergedStatesById = {};
  for (const state of states) {
    const candidates = optionsByState.get(state.id) || [];
    const selected = state.id === 'state_1' ? null : (candidates.find(item => item.default) || candidates[0] || null);
    const cleanImplementation = cleanConfirmedImplementation(selected);
    if (cleanImplementation) implementationsConfirmedById[state.id] = cleanImplementation;
    mergedStatesById[state.id] = {
      ...cleanConfirmedState(state),
      implementation: cleanImplementation,
    };
  }
  return { mergedStatesById, implementationsConfirmedById };
}

function validateBlueprintBuilderInput(input) {
  const issues = [];
  if (!input?.brief) issues.push('missing brief');
  if (!input?.user_story_confirmed || typeof input.user_story_confirmed !== 'object') issues.push('missing user_story_confirmed');
  if (!input?.merged_states_by_id || typeof input.merged_states_by_id !== 'object') issues.push('missing merged_states_by_id');
  if (input?.page_dsl == null) issues.push('missing page_dsl');
  const mergedStates = Object.values(input?.merged_states_by_id || {});
  if (!input?.merged_states_by_id?.state_1) issues.push('merged_states_by_id.state_1 missing');
  if (input?.merged_states_by_id?.state_1?.implementation !== null) issues.push('state_1 implementation must be null');
  const missingImpl = mergedStates.filter(state => state.id !== 'state_1' && !state.implementation).map(state => state.id);
  if (missingImpl.length) issues.push(`missing implementation for ${missingImpl.join(', ')}`);
  return issues;
}

async function runBlueprintBuilderPhase(testDir, opts) {
  const sourceDir = path.resolve(ROOT, testDir);
  const brief = readBrief(sourceDir, opts);
  const pageDslPath = [path.join(sourceDir, 'spec.json'), path.join(sourceDir, 'wps_doc_0.dsl.json'), path.join(sourceDir, 'page_dsl.json')].find(p => fs.existsSync(p));
  if (!brief) throw new Error(`Missing brief: ${sourceDir}`);
  if (!pageDslPath) throw new Error(`Missing spec.json/page DSL: ${sourceDir}`);

  const phase3Path = latestPhaseFile(sourceDir, '_phase3', path.join('stages', 'phase3_implementation_plan.json'));
  if (!phase3Path) throw new Error(`Missing latest phase3_implementation_plan.json: ${sourceDir}`);
  const phase3StageDir = path.dirname(phase3Path);
  const phase1Path = path.join(phase3StageDir, 'phase1_user_story.json');
  const phase2Path = path.join(phase3StageDir, 'phase2_state_enumeration.json');
  const userStoryPath = fs.existsSync(phase1Path) ? phase1Path : latestPhaseFile(sourceDir, '_phase1', path.join('stages', 'phase1_user_story.json'));
  const statesPath = fs.existsSync(phase2Path) ? phase2Path : latestPhaseFile(sourceDir, '_phase2', path.join('stages', 'phase2_state_enumeration.json'));
  if (!userStoryPath) throw new Error(`Missing phase1_user_story.json for phase4: ${sourceDir}`);
  if (!statesPath) throw new Error(`Missing phase2_state_enumeration.json for phase4: ${sourceDir}`);

  const userStory = readJsonFile(userStoryPath);
  const states = readJsonFile(statesPath);
  const implementationOptions = readJsonFile(phase3Path);
  const pageDsl = parseJsonOrText(readTextIfExists(pageDslPath));
  const userStoryConfirmed = omitKeys(userStory, ['invest_check']);
  const { mergedStatesById, implementationsConfirmedById } = composeMergedStatesById(states, implementationOptions);
  const stamp = opts.stamp;
  const outDir = path.join(sourceDir, 'html', `_run_skills_${opts.model}_${stamp}_phase4`);
  const stageDir = path.join(outDir, 'stages');
  const builderInput = {
    action: 'done',
    phase: 4,
    source_dir: testDir,
    generated_at: new Date().toISOString(),
    sources: {
      brief: path.relative(ROOT, briefPath(sourceDir, opts)),
      page_dsl: path.relative(ROOT, pageDslPath),
      phase1_user_story: path.relative(ROOT, userStoryPath),
      phase2_state_enumeration: path.relative(ROOT, statesPath),
      phase3_implementation_plan: path.relative(ROOT, phase3Path),
    },
    brief,
    user_story_confirmed: userStoryConfirmed,
    merged_states_by_id: mergedStatesById,
    page_dsl: pageDsl,
  };
  const issues = validateBlueprintBuilderInput(builderInput);
  await fsp.mkdir(stageDir, { recursive: true });
  await fsp.writeFile(path.join(stageDir, 'phase1_user_story.json'), JSON.stringify(userStoryConfirmed, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'phase2_state_enumeration.json'), JSON.stringify(states, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'implementations_confirmed_by_id.json'), JSON.stringify(implementationsConfirmedById, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'merged_states_by_id.json'), JSON.stringify(mergedStatesById, null, 2), 'utf8');
  await fsp.writeFile(path.join(stageDir, 'blueprint_builder_input.json'), JSON.stringify(builderInput, null, 2), 'utf8');
  await fsp.writeFile(path.join(outDir, 'run_report.json'), JSON.stringify({
    source_dir: testDir,
    model: opts.model,
    phase: 'phase4_blueprint_builder_input',
    sources: builderInput.sources,
    states: states.length,
    implementations_confirmed: Object.keys(implementationsConfirmedById).length,
    output: path.join(stageDir, 'blueprint_builder_input.json'),
    issues,
  }, null, 2), 'utf8');
  return { testDir, outDir, phase: 'phase4_blueprint_builder_input', ok: issues.length === 0, states: states.length, implementations: Object.keys(implementationsConfirmedById).length, issues };
}

async function main() {
  const args = process.argv.slice(2);
  const skillIdx = args.indexOf('--skill');
  const modelIdx = args.indexOf('--model');
  const dirsIdx = args.indexOf('--dirs');
  const inputIdx = args.indexOf('--input');
  const noRepair = args.includes('--no-repair');
  const maxRetriesIdx = args.indexOf('--max-retries');
  const skill = skillIdx >= 0 ? args[skillIdx + 1] : 'taskflow-blueprint';
  const model = modelIdx >= 0 ? args[modelIdx + 1] : 'qwen3.7-max';
  const maxRetries = maxRetriesIdx >= 0 ? Number(args[maxRetriesIdx + 1]) : 2;
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : '';
  const stopFlags = [skillIdx, modelIdx, maxRetriesIdx, inputIdx].filter(i => i >= 0);
  const dirsEnd = stopFlags.filter(i => i > dirsIdx).sort((a, b) => a - b)[0] || args.length;
  const dirs = dirsIdx >= 0 ? args.slice(dirsIdx + 1, dirsEnd).filter(d => !d.startsWith('--')) : [];
  const supported = new Set(['taskflow-blueprint', 'taskflow-user-story', 'taskflow-state-enumeration', 'taskflow-implementation-plan', 'taskflow-blueprint-builder']);
  if (!supported.has(skill)) {
    throw new Error(`Unsupported --skill ${skill}. Use taskflow-blueprint | taskflow-user-story | taskflow-state-enumeration | taskflow-implementation-plan | taskflow-blueprint-builder`);
  }
  if (!dirs.length) {
    throw new Error('Usage: node run_skills.js --skill taskflow-user-story --model qwen3.7-max --dirs new_test/1 ...');
  }
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const results = [];
  for (const dir of dirs) {
    console.log(`[run_skills] ${dir} -> ${skill} (${model})`);
    if (skill === 'taskflow-user-story') {
      const r = await runUserStoryPhase(dir, { model, stamp, inputPath });
      results.push(r);
      console.log(`[run_skills] done ${dir}: phase1 ok, out=${r.outDir}`);
      continue;
    }
    if (skill === 'taskflow-state-enumeration') {
      const r = await runStateEnumerationPhase(dir, { model, stamp, inputPath });
      results.push(r);
      console.log(`[run_skills] done ${dir}: phase2 ok, states=${r.states}, out=${r.outDir}`);
      continue;
    }
    if (skill === 'taskflow-implementation-plan') {
      const r = await runImplementationPlanPhase(dir, { model, stamp, inputPath });
      results.push(r);
      console.log(`[run_skills] done ${dir}: phase3 ok, options=${r.options}, out=${r.outDir}`);
      continue;
    }
    if (skill === 'taskflow-blueprint-builder') {
      const r = await runBlueprintBuilderPhase(dir, { model, stamp, inputPath });
      results.push(r);
      console.log(`[run_skills] done ${dir}: phase4 ok=${r.ok}, states=${r.states}, implementations=${r.implementations}, out=${r.outDir}`);
      continue;
    }
    const r = await runBlueprint(dir, { model, stamp, noRepair, maxRetries, inputPath });
    results.push(r);
    console.log(`[run_skills] done ${dir}: states=${r.states}, issues=${r.issues.length}, out=${r.outDir}`);
  }
  const summaryPath = path.join(ROOT, 'new_test', `_run_skills_${model}_${stamp}_summary.json`);
  await fsp.writeFile(summaryPath, JSON.stringify({ model, skill, stamp, results }, null, 2), 'utf8');
  console.log(`[run_skills] summary ${summaryPath}`);
  if (results.some(r => r.issues?.length || r.ok === false)) process.exitCode = 2;
}

main().catch(err => { console.error('[run_skills] failed:', err.stack || err.message); process.exit(1); });