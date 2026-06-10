function renderOption(option) {
  const marker = Object.prototype.hasOwnProperty.call(option, 'default')
    ? `[${option.default ? 'x' : ' '}] `
    : '';
  const lines = [`- ${marker}${option.id}`];
  if (option.label) lines.push(`  ${option.label}`);
  if (option.implementation_plan) lines.push(`  ${option.implementation_plan}`);
  if (option.description) lines.push(`  ${option.description.replace(/\n/g, '\n  ')}`);
  if (option.rationale) lines.push(`  原因：${option.rationale}`);
  return lines.join('\n');
}

function renderAsk(payload) {
  const lines = [
    `Phase ${payload.phase}: ${payload.questionText || '待确认'}`,
    payload.note || '',
  ].filter(Boolean);
  let currentGroup = '';
  for (const option of payload.options || []) {
    if (option.group && option.group !== currentGroup) {
      currentGroup = option.group;
      lines.push('', currentGroup);
    }
    lines.push(renderOption(option));
  }
  return lines.join('\n');
}

function renderPreview(payload) {
  const lines = ['Phase 4 蓝图预览'];
  for (const [stateId, state] of Object.entries(payload.merged_states_by_id || {})) {
    lines.push('', `${stateId} · ${state.label}`, state.description || '');
    if (state.implementation?.implementation_plan) {
      lines.push(`实现：${state.implementation.implementation_plan}`);
    }
  }
  if (payload.validation_issues?.length) {
    lines.push('', '校验问题：', ...payload.validation_issues.map((issue) => `- ${issue}`));
  }
  return lines.join('\n');
}

function renderView(payload) {
  return payload?.action === 'preview' ? renderPreview(payload) : renderAsk(payload);
}

module.exports = { renderView };
