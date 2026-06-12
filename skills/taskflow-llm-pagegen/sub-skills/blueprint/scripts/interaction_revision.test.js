const assert = require('assert');
const {
  applyPhase2Selection,
  finalizePhase4,
  synthesizePhase1Confirmed,
} = require('./compose_confirmed');
const {
  buildFeedback,
  parseNumberedRevisionText,
} = require('./numbered_interaction');
const { normalizeRevision, stateCountIssues } = require('./phase_runners');
const { GROUPS, validatePhase } = require('./validate_phase');

function phase1Payload() {
  const options = [];
  for (const [key, group] of Object.entries(GROUPS)) {
    for (let index = 1; index <= 3; index += 1) {
      options.push({
        id: `${key}_${index}`,
        group,
        label: `${key} option ${index}`,
        rationale: 'test',
        default: index === 1,
      });
    }
  }
  return { action: 'ask', phase: 1, options };
}

function testSelectedOptionsBecomeCompleteContent() {
  const payload = phase1Payload();
  const feedback = buildFeedback(payload, [1, 4, 7, 10], new Map());
  const complete = synthesizePhase1Confirmed(payload, feedback);
  assert.equal(complete.actor, 'actor option 1');
  assert.equal(complete.trigger, 'trigger option 1');
  assert.equal(complete.happy_path, 'happy_path option 1');
  assert.equal(complete.success_criteria, 'success_criteria option 1');
  assert.ok(complete.user_story.includes(complete.happy_path));
}

function testRevisionPreservesSelectionMetadata() {
  const payload = phase1Payload();
  const complete = synthesizePhase1Confirmed(
    payload,
    buildFeedback(payload, [1, 4, 7, 10], new Map()),
  );
  const revised = normalizeRevision(1, complete, {
    ...complete,
    happy_path: '模型根据修改意见生成的新完整路径',
    goal: '模型根据修改意见生成的新完整路径',
    user_story: '修改后的完整 User Story',
  });
  assert.equal(revised.selections.happy_path.option_id, 'custom');
  assert.equal(revised.selections.happy_path.text, '模型根据修改意见生成的新完整路径');
  assert.equal(revised.selections.actor.option_id, 'actor_1');
}

function testTextFeedbackUsesModelRevisionScript() {
  const script = parseNumberedRevisionText(
    phase1Payload(),
    '1,4,7,10\n让主路径增加确认弹窗\n7=成功后展示结果页\nnext\n',
  );
  assert.equal(script.__model_revision_script, true);
  assert.deepEqual(script.modification_feedback, [
    '让主路径增加确认弹窗',
    '请重点修改编号 7 对应的内容：成功后展示结果页',
  ]);
  assert.equal(script.selection_feedback.selections.actor, 'actor_1');
}

function state(id, label, previousId) {
  return {
    id,
    label,
    description: [
      `触发条件：从${previousId || '入口'}进入。`,
      `展示信息：展示${label}。`,
      `继承信息：继承${previousId || '无'}。`,
    ].join('\n'),
  };
}

function implementationState(id, label, previousId) {
  return {
    ...state(id, label, previousId),
    implementation: id === 'state_1' ? null : {
      implementation_plan: `${label}的完整 UI 实现方案`,
    },
  };
}

function testPhase2CanAddAndRenumberStates() {
  const current = {
    action: 'confirmed',
    phase: 2,
    states: [
      state('state_1', '商品列表初始态'),
      state('state_2', '产品详情态', 'state_1'),
      state('state_3', '配单清单态', 'state_2'),
      state('state_4', '配单编辑态', 'state_3'),
      state('state_5', '提交中态', 'state_4'),
      state('state_6', '成功态', 'state_5'),
    ],
  };
  const revised = normalizeRevision(2, current, {
    states: [
      state('state_1', '商品列表初始态'),
      state('state_2', '产品详情态', 'state_1'),
      state('state_3', '配单清单态', 'state_2'),
      state('state_4', '去配单确认态', 'state_3'),
      state('state_5', '配单编辑态', 'state_4'),
      state('state_6', '提交中态', 'state_5'),
      state('state_7', '成功态', 'state_6'),
    ],
  });
  assert.equal(revised.states.length, 7);
  assert.deepEqual(revised.states.map((item) => item.id), [
    'state_1', 'state_2', 'state_3', 'state_4', 'state_5', 'state_6', 'state_7',
  ]);
  assert.equal(revised.states[3].label, '去配单确认态');
  assert.ok(revised.states[4].description.includes('state_4'));
  assert.equal(validatePhase(2, 'confirmed', revised).valid, true);
}

function testPhase2CanDeleteAndRenumberStates() {
  const current = {
    action: 'confirmed',
    phase: 2,
    states: [
      state('state_1', '初始态'),
      state('state_2', '详情态', 'state_1'),
      state('state_3', '确认态', 'state_2'),
      state('state_4', '提交中态', 'state_3'),
      state('state_5', '成功态', 'state_4'),
    ],
  };
  const revised = normalizeRevision(2, current, {
    states: [
      state('state_1', '初始态'),
      state('state_2', '详情态', 'state_1'),
      state('state_3', '确认态', 'state_2'),
      state('state_5', '成功态', 'state_3'),
    ],
  });
  assert.deepEqual(revised.states.map((item) => item.id), [
    'state_1', 'state_2', 'state_3', 'state_4',
  ]);
  assert.equal(revised.states[3].label, '成功态');
  assert.ok(revised.states[3].description.includes('state_3'));
  assert.equal(validatePhase(2, 'confirmed', revised).valid, true);
}

function testPhase2SelectionDeletesAndRepairsReferences() {
  const ask = {
    action: 'ask',
    phase: 2,
    options: [
      state('state_1', '初始态'),
      state('state_2', '详情态', 'state_1'),
      state('state_3', '确认态', 'state_2'),
      state('state_4', '提交态', 'state_3'),
      state('state_5', '成功态', 'state_4'),
    ],
  };
  const confirmed = applyPhase2Selection(ask, {
    selected_ids: ['state_1', 'state_2', 'state_3', 'state_5'],
  });
  assert.deepEqual(confirmed.states.map((item) => item.id), [
    'state_1', 'state_2', 'state_3', 'state_4',
  ]);
  assert.equal(confirmed.states[3].label, '成功态');
  assert.ok(confirmed.states[3].description.includes('state_3'));
  assert.equal(validatePhase(2, 'confirmed', confirmed).valid, true);
}

function testPhase4SelectionDeletesUnselectedStates() {
  const preview = {
    action: 'preview',
    phase: 4,
    brief: 'test',
    user_story_confirmed: {},
    merged_states_by_id: Object.fromEntries([
      implementationState('state_1', '初始态'),
      implementationState('state_2', '详情态', 'state_1'),
      implementationState('state_3', '确认态', 'state_2'),
      implementationState('state_4', '提交态', 'state_3'),
      implementationState('state_5', '成功态', 'state_4'),
    ].map((item) => [item.id, item])),
    page_dsl: {},
  };
  const feedback = buildFeedback(preview, [1, 2, 3, 5], new Map());
  const done = finalizePhase4(preview, feedback, {});
  assert.deepEqual(Object.keys(done.merged_states_by_id), [
    'state_1', 'state_2', 'state_3', 'state_4',
  ]);
  assert.equal(done.merged_states_by_id.state_4.label, '成功态');
  assert.ok(done.merged_states_by_id.state_4.description.includes('state_3'));
}

function testPhase4CanAddStateWithImplementation() {
  const current = {
    action: 'done',
    phase: 4,
    source_dir: 'new_test/13',
    sources: {},
    generated_at: '2026-06-12T00:00:00.000Z',
    brief: 'test',
    user_story_confirmed: {},
    page_dsl: {},
    merged_states_by_id: Object.fromEntries([
      implementationState('state_1', '初始态'),
      implementationState('state_2', '详情态', 'state_1'),
      implementationState('state_3', '确认态', 'state_2'),
      implementationState('state_4', '成功态', 'state_3'),
    ].map((item) => [item.id, item])),
  };
  const parsedStates = [
    implementationState('state_1', '初始态'),
    implementationState('state_2', '详情态', 'state_1'),
    implementationState('state_3', '确认态', 'state_2'),
    implementationState('state_4', '处理中态', 'state_3'),
    implementationState('state_5', '成功态', 'state_4'),
  ];
  const revised = normalizeRevision(4, current, {
    ...current,
    merged_states_by_id: Object.fromEntries(parsedStates.map((item) => [item.id, item])),
  });
  assert.equal(Object.keys(revised.merged_states_by_id).length, 5);
  assert.equal(revised.merged_states_by_id.state_4.label, '处理中态');
  assert.ok(revised.merged_states_by_id.state_4.implementation.implementation_plan);
  assert.equal(validatePhase(4, 'confirmed', revised).valid, true);
}

function testStateCountIntentValidation() {
  const phase2Current = {
    action: 'confirmed',
    phase: 2,
    states: [
      state('state_1', '初始态'),
      state('state_2', '详情态', 'state_1'),
      state('state_3', '确认态', 'state_2'),
      state('state_4', '成功态', 'state_3'),
    ],
  };
  assert.equal(
    stateCountIssues(2, phase2Current, phase2Current, '在 state_3 后增加一个状态').length,
    1,
  );
  const added = {
    ...phase2Current,
    states: [...phase2Current.states, state('state_5', '新增态', 'state_4')],
  };
  assert.equal(
    stateCountIssues(2, phase2Current, added, '在 state_3 后增加一个状态').length,
    0,
  );
}

testSelectedOptionsBecomeCompleteContent();
testRevisionPreservesSelectionMetadata();
testTextFeedbackUsesModelRevisionScript();
testPhase2CanAddAndRenumberStates();
testPhase2CanDeleteAndRenumberStates();
testPhase2SelectionDeletesAndRepairsReferences();
testPhase4SelectionDeletesUnselectedStates();
testPhase4CanAddStateWithImplementation();
testStateCountIntentValidation();
console.log('interaction_revision tests passed');
