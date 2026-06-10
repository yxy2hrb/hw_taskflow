const fs = require('fs');
const path = require('path');
const { callQwen, clip, extractJSON, readTextIfExists } = require('./llm');
const {
  assertCanConfirm,
  assertCanGenerate,
  loadSession,
  logFile,
  patchSession,
  readJson,
  relativeToRoot,
  resolveFromRoot,
  stageFile,
  validationFile,
  writeJson,
} = require('./session');
const {
  applyPhase2Selection,
  applyPhase3Selection,
  buildPhase4Preview,
  finalizePhase4,
  synthesizePhase1Confirmed,
} = require('./compose_confirmed');
const { validatePhase } = require('./validate_phase');

const SKILL_ROOT = path.resolve(__dirname, '..');

class ValidationError extends Error {
  constructor(message, report) {
    super(message);
    this.name = 'ValidationError';
    this.report = report;
    this.exitCode = 2;
  }
}

function skillDoc(relative) {
  return readTextIfExists(path.join(SKILL_ROOT, relative));
}

function readSessionText(session, key) {
  return readTextIfExists(resolveFromRoot(session.paths[key])).trim();
}

function readPageDsl(session) {
  return readTextIfExists(resolveFromRoot(session.paths.page_dsl)).trim();
}

function normalizePhase1Ask(parsed) {
  return {
    action: 'ask',
    phase: 1,
    questionText: parsed.questionText || '请从下面四个维度各选一项，我会合成完整 User Story。',
    multiSelect: true,
    allowCustom: true,
    note: parsed.note || '四个维度各选一项；也可在补充栏直接写覆盖内容。',
    options: Array.isArray(parsed.options) ? parsed.options : [],
  };
}

function normalizePhase2Ask(parsed) {
  return {
    action: 'ask',
    phase: 2,
    questionText: parsed.questionText || '以下是 happy-path 状态清单，请确认保留哪些、是否需要补充。',
    multiSelect: true,
    allowCustom: true,
    note: parsed.note || '默认全部保留；取消不需要的状态；补充栏可写新状态。',
    options: (Array.isArray(parsed.options) ? parsed.options : []).map((option, index) => ({
      id: option.id || `state_${index + 1}`,
      label: option.label || option.state_name || `状态 ${index + 1}`,
      description: option.description || '',
      rationale: option.rationale || '',
      default: option.default !== false,
    })),
  };
}

function normalizePhase3Ask(parsed) {
  return {
    action: 'ask',
    phase: 3,
    questionText: parsed.questionText || '以下是每个状态的 UI 实现草案，请逐项确认或修改。',
    multiSelect: false,
    allowCustom: true,
    note: parsed.note || '每个非初始状态仅有一份实现草案；可单独修改任意 state 的 implementation_plan。',
    options: (Array.isArray(parsed.options) ? parsed.options : []).map((option) => ({
      id: option.id || '',
      group: option.group || '',
      implementation_plan: option.implementation_plan || option.implementationPlan || option.plan || option.label || '',
      rationale: option.rationale || '',
    })),
  };
}

async function writeValidationOrThrow(sessionDir, paths, phase, kind, payload, context) {
  const report = validatePhase(phase, kind, payload, context);
  await writeJson(validationFile(paths, `phase${phase}_report.json`), report);
  if (!report.valid) {
    await patchSession(sessionDir, { status: 'failed' });
    throw new ValidationError(`Phase ${phase} ${kind} validation failed`, report);
  }
  return report;
}

async function writeAsk(sessionDir, paths, session, phase, ask, raw, context = {}) {
  await writeJson(logFile(paths, `phase${phase}_raw.json`), raw);
  await writeJson(stageFile(paths, `phase${phase}_ask.json`), ask);
  await writeValidationOrThrow(sessionDir, paths, phase, 'ask', ask, context);
  await patchSession(sessionDir, {
    status: 'awaiting_confirm',
    current_phase: phase,
  });
  return ask;
}

async function runPhase1Generate(sessionDir) {
  const paths = await loadSession(sessionDir);
  const { session } = paths;
  assertCanGenerate(session, 1);
  await patchSession(sessionDir, { status: 'generating' });
  const brief = readSessionText(session, 'brief');
  const pageDsl = readPageDsl(session);
  const system = [
    'You are taskflow-user-story interactive generate mode.',
    'Return ONLY strict JSON.',
    'Do not return a confirmed user story. Return an ask payload with four option groups.',
    'Each group must have 2-4 options, except Success Criteria has 2-3.',
    'Each group must have exactly one default:true option.',
    'Required shape: {"action":"ask","phase":1,"questionText":"...","multiSelect":true,"allowCustom":true,"note":"...","options":[{"id":"actor_1","group":"① Actor · 主角","label":"...","rationale":"...","default":true}]}',
    skillDoc('sub-skills/user-story/SKILL.md'),
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Generate phase1_ask.json only.',
    brief,
    page_dsl: clip(pageDsl, 14000),
    required_groups: [
      '① Actor · 主角',
      '② Trigger · 触发点',
      '③ Goal & Happy Path · 核心目标与理想路径',
      '④ Success Criteria · 成功判定',
    ],
  }, null, 2);
  const rawText = await callQwen({ system, user, model: session.model });
  const ask = normalizePhase1Ask(extractJSON(rawText));
  return writeAsk(sessionDir, paths, session, 1, ask, { raw_text: rawText, parsed: ask });
}

async function runPhase2Generate(sessionDir) {
  const paths = await loadSession(sessionDir);
  const { session } = paths;
  assertCanGenerate(session, 2);
  await patchSession(sessionDir, { status: 'generating' });
  const brief = readSessionText(session, 'brief');
  const pageDsl = readPageDsl(session);
  const phase1 = await readJson(stageFile(paths, 'phase1_confirmed.json'));
  const system = [
    'You are taskflow-state-enumeration interactive generate mode.',
    'Return ONLY strict JSON.',
    'Generate phase2_ask.json with happy-path states only.',
    'Default all states to true, state_1 must be first, and options length must be >= 4.',
    'Every description must contain these exact sections: 触发条件：, 展示信息：, 继承信息：.',
    skillDoc('sub-skills/state-enumeration/SKILL.md'),
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Generate phase2_ask.json only.',
    brief,
    phase1_confirmed: phase1,
    page_dsl: clip(pageDsl, 16000),
  }, null, 2);
  const rawText = await callQwen({ system, user, model: session.model });
  const ask = normalizePhase2Ask(extractJSON(rawText));
  return writeAsk(sessionDir, paths, session, 2, ask, { raw_text: rawText, parsed: ask });
}

async function runPhase3Generate(sessionDir) {
  const paths = await loadSession(sessionDir);
  const { session } = paths;
  assertCanGenerate(session, 3);
  await patchSession(sessionDir, { status: 'generating' });
  const brief = readSessionText(session, 'brief');
  const pageDsl = readPageDsl(session);
  const phase1 = await readJson(stageFile(paths, 'phase1_confirmed.json'));
  const phase2 = await readJson(stageFile(paths, 'phase2_confirmed.json'));
  const system = [
    'You are taskflow-implementation-plan interactive generate mode.',
    'Return ONLY strict JSON.',
    'Generate exactly ONE complete UI implementation plan for every non-state_1 state.',
    'Do not include state_1 in options.',
    'Use exactly one option per state, with id format state_N::implementation.',
    'The ask payload must set multiSelect:false and allowCustom:true.',
    'Do not output default fields. The user reviews the single plan and may edit each state independently.',
    skillDoc('sub-skills/implementation-plan/SKILL.md'),
  ].join('\n\n');
  const user = JSON.stringify({
    task: 'Generate phase3_ask.json only.',
    brief,
    phase1_confirmed: phase1,
    phase2_confirmed: phase2,
    page_dsl: clip(pageDsl, 16000),
  }, null, 2);
  const rawText = await callQwen({ system, user, model: session.model });
  const ask = normalizePhase3Ask(extractJSON(rawText));
  return writeAsk(sessionDir, paths, session, 3, ask, { raw_text: rawText, parsed: ask }, { states: phase2.states });
}

async function runPhase4Build(sessionDir) {
  const paths = await loadSession(sessionDir);
  const { session } = paths;
  assertCanGenerate(session, 4);
  await patchSession(sessionDir, { status: 'generating' });
  const brief = readSessionText(session, 'brief');
  const pageDsl = readPageDsl(session);
  const phase1 = await readJson(stageFile(paths, 'phase1_confirmed.json'));
  const phase2 = await readJson(stageFile(paths, 'phase2_confirmed.json'));
  const phase3 = await readJson(stageFile(paths, 'phase3_confirmed_by_id.json'));
  const preview = buildPhase4Preview({ brief, pageDsl, phase1, phase2, phase3 });
  const report = validatePhase(4, 'preview', preview, { states: phase2.states });
  preview.validation_issues = report.issues;
  await writeJson(stageFile(paths, 'phase4_preview.json'), preview);
  await writeJson(validationFile(paths, 'phase4_report.json'), report);
  if (!report.valid) {
    await patchSession(sessionDir, { status: 'failed' });
    throw new ValidationError('Phase 4 preview validation failed', report);
  }
  await patchSession(sessionDir, {
    status: 'awaiting_confirm',
    current_phase: 4,
  });
  return preview;
}

async function generatePhase(sessionDir, phase) {
  const runners = {
    1: runPhase1Generate,
    2: runPhase2Generate,
    3: runPhase3Generate,
    4: runPhase4Build,
  };
  return runners[phase](sessionDir);
}

async function confirmPhase(sessionDir, phase, feedback = {}, options = {}) {
  const paths = await loadSession(sessionDir);
  const { session } = paths;
  assertCanConfirm(session, phase);
  let output;
  let report;
  if (phase === 1) {
    const ask = await readJson(stageFile(paths, 'phase1_ask.json'));
    output = synthesizePhase1Confirmed(ask, feedback, options);
    report = validatePhase(1, 'confirmed', output);
  } else if (phase === 2) {
    const ask = await readJson(stageFile(paths, 'phase2_ask.json'));
    output = applyPhase2Selection(ask, feedback, options);
    report = validatePhase(2, 'confirmed', output);
  } else if (phase === 3) {
    const ask = await readJson(stageFile(paths, 'phase3_ask.json'));
    const phase2 = await readJson(stageFile(paths, 'phase2_confirmed.json'));
    output = applyPhase3Selection(ask, feedback, phase2.states, options);
    report = validatePhase(3, 'confirmed', output, { states: phase2.states });
  } else if (phase === 4) {
    const preview = await readJson(stageFile(paths, 'phase4_preview.json'));
    const phase2 = await readJson(stageFile(paths, 'phase2_confirmed.json'));
    const metadata = {
      source_dir: session.source_dir,
      sources: {
        brief: session.paths.brief,
        page_dsl: session.paths.page_dsl,
        phase1_confirmed: relativeToRoot(stageFile(paths, 'phase1_confirmed.json')),
        phase2_confirmed: relativeToRoot(stageFile(paths, 'phase2_confirmed.json')),
        phase3_confirmed_by_id: relativeToRoot(stageFile(paths, 'phase3_confirmed_by_id.json')),
      },
    };
    output = finalizePhase4(preview, feedback, metadata);
    report = validatePhase(4, 'confirmed', output, { states: phase2.states });
  } else {
    throw new Error(`Invalid phase: ${phase}`);
  }

  await writeJson(validationFile(paths, `phase${phase}_report.json`), report);
  if (!report.valid) {
    throw new ValidationError(`Phase ${phase} confirmation validation failed`, report);
  }
  if (phase === 1) await writeJson(stageFile(paths, 'phase1_confirmed.json'), output);
  if (phase === 2) await writeJson(stageFile(paths, 'phase2_confirmed.json'), output);
  if (phase === 3) await writeJson(stageFile(paths, 'phase3_confirmed_by_id.json'), output);
  if (phase === 4) await writeJson(stageFile(paths, 'blueprint_builder_input.json'), output);

  const completed = Array.from(new Set([...(session.completed_phases || []), phase])).sort((a, b) => a - b);
  await patchSession(sessionDir, {
    completed_phases: completed,
    current_phase: phase < 4 ? phase + 1 : 4,
    status: phase < 4 ? 'idle' : 'completed',
  });
  return output;
}

function latestStagePayload(paths, session) {
  if (session.status === 'awaiting_confirm') {
    const name = session.current_phase === 4 ? 'phase4_preview.json' : `phase${session.current_phase}_ask.json`;
    const file = stageFile(paths, name);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  if (session.status === 'completed') {
    const file = stageFile(paths, 'blueprint_builder_input.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return null;
}

module.exports = {
  ValidationError,
  confirmPhase,
  generatePhase,
  latestStagePayload,
};
