/**
 * ============================================================
 *  Happy Path 抽取
 *
 *  blueprint.states 里的每个 state 带 last_state 字段，构成森林。
 *  从 state_1（root）出发，沿"成功类后继" 一路走，直到没有后继为止。
 *  过滤掉名字 / 描述里命中 "取消 / 失败 / 异常 / 网络 / 错误 / 校验失败 / 超时"
 *  等关键词的分支 —— 这些是错误反馈支线，不属于主线。
 *
 *  返回值 = happy path 上的 state 数组（按出现顺序，含 state_1）。
 * ============================================================
 */

const NEGATIVE_PAT = /(取消|失败|异常|出错|错误|网络|加载错误|加载不成功|超时|校验失败|未通过|aborted?|cancel(?:l?ed)?|fail(?:ed|ure)?|error|timeout|invalid)/i;

function isNegativeBranch(state) {
  const text = [state.state_name, state.description, state.implementation_method]
    .filter(Boolean).join(" ");
  return NEGATIVE_PAT.test(text);
}

function extractHappyPath(states) {
  if (!Array.isArray(states) || !states.length) return [];

  const sorted = states.slice().sort((a, b) => a.state_id - b.state_id);
  const byId = new Map(sorted.map(s => [s.state_id, s]));
  const childrenOf = new Map();
  for (const s of sorted) {
    if (s.last_state != null) {
      if (!childrenOf.has(s.last_state)) childrenOf.set(s.last_state, []);
      childrenOf.get(s.last_state).push(s);
    }
  }

  const root = sorted.find(s => s.state_id === 1) || sorted[0];
  const path = [root];
  const visited = new Set([root.state_id]);

  let cursor = root;
  // 最多走 20 步，防御循环引用
  for (let i = 0; i < 20; i++) {
    const kids = childrenOf.get(cursor.state_id) || [];
    if (!kids.length) break;
    // 优先选非"负向分支"的后继；如果全是负向，跳出（happy 已结束）
    const positive = kids.filter(k => !isNegativeBranch(k) && !visited.has(k.state_id));
    if (!positive.length) break;
    // 多个正向后继时取 state_id 最小（典型生成顺序：成功态 id 更靠前）
    positive.sort((a, b) => a.state_id - b.state_id);
    cursor = positive[0];
    visited.add(cursor.state_id);
    path.push(cursor);
  }
  return path;
}

module.exports = { extractHappyPath, isNegativeBranch };
