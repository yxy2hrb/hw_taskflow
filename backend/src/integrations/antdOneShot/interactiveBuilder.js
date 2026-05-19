/**
 * ============================================================
 *  antdOneShot · interactiveBuilder
 *
 *  把 N 个 per-state HTML snapshot + 每个 state 的 JSX islands 字典
 *  打包成单个可交互 HTML：
 *    · 内置 React 18 + ReactDOM 18 + antd-mobile v5 + Babel standalone（CDN）
 *    · 每个 state 用 <div data-state="K"> 包住完整 body 内容
 *    · 一次只展示一个 state（其它 display:none）
 *    · 文档级点击代理：点 [data-next-state] → 切换到对应 state
 *    · 切换时把当前 state 内的 [data-jsx-island] 占位 div 用 React 挂载
 *
 *  输入：
 *    baseHtml         基线 HTML（用作 <head> 模板）
 *    happyPath        happy path state 数组（按顺序）
 *    snapshots        { state_id → 应用本 state edits 后的完整 body 内 HTML }
 *    islandsByState   { state_id → { island-id → JSX 字符串 } }
 *
 *  注：snapshots 里的 body 内容会被照搬进 <div data-state="K">，
 *      意味着 D2C 的 id="123_456" 会在多个 state 内重复出现。这是已知问题，
 *      由于一次只有一个 state visible，CSS 仍然能正常绘制；下一版会做 id 命名空间。
 * ============================================================
 */

function extractHead(html) {
  const m = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : "";
}

function extractBody(html) {
  const m = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

function escapeForScript(s) {
  // 防止 string 里出现 </script> 把外层脚本截断
  return String(s).replace(/<\/script/gi, "<\\/script");
}

/**
 * 收集所有 state 的 islands 合并成一份 ISLANDS 字典。
 * 注意：JSX 表达式以"裸文本"形式拼进 <script type="text/babel"> 里，
 * Babel 会在浏览器侧把它转成 React.createElement。
 */
function buildIslandsCode(islandsByState) {
  const entries = [];
  for (const { state_id, islands } of islandsByState) {
    for (const [id, jsx] of Object.entries(islands || {})) {
      const safeJsx = String(jsx).trim();
      // 用箭头函数包成 component，方便 <Comp/> 调用
      entries.push(`  ${JSON.stringify(id)}: () => (${safeJsx})`);
    }
  }
  return entries.join(",\n");
}

function buildInteractiveHtml({ baseHtml, happyPath, snapshots, islandsByState }) {
  const head = extractHead(baseHtml);
  const firstStateId = happyPath[0]?.state_id ?? 1;

  const stateDivs = happyPath.map(s => {
    const body = snapshots[s.state_id] || "";
    return `<div data-state="${s.state_id}" data-state-name="${escapeAttr(s.state_name || "")}" style="display:none">
${body}
</div>`;
  }).join("\n");

  const islandsCode = buildIslandsCode(islandsByState);

  // happy path 顺序，前端导航条可以渲染成"步骤指示器"
  const happyPathMeta = happyPath.map(s => ({
    state_id: s.state_id,
    state_name: s.state_name || `state ${s.state_id}`,
  }));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>antd-mobile 任务流 · interactive demo</title>
${head}
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/antd-mobile@5/bundle/antd-mobile.umd.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
  body { margin: 0; background:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif; }
  [data-state] { position: relative; }
  /* 顶部步骤指示器 */
  .__hm-stepper {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: rgba(255,255,255,.92); backdrop-filter: blur(10px);
    border-bottom: 1px solid #eee; padding: 8px 12px;
    display: flex; gap: 6px; align-items: center; font-size: 12px; color: #555;
    overflow-x: auto; white-space: nowrap;
  }
  .__hm-stepper .__hm-step {
    padding: 4px 10px; border-radius: 999px; background: #eee; cursor: pointer;
    transition: all .15s;
  }
  .__hm-stepper .__hm-step.__active { background: #1677ff; color: #fff; }
  .__hm-stepper .__hm-step.__done { background: #b7eb8f; color: #135200; }
  .__hm-stepper .__hm-hint { margin-left: auto; color: #999; font-size: 11px; }
  /* base HTML 的 wrapper：上面给步骤条让 36px 空间 */
  [data-state] > * { margin-top: 0; }
  body { padding-top: 36px; }
</style>
</head>
<body>
<div class="__hm-stepper" id="__hm-stepper"></div>
${stateDivs}
<script>
window.__HM_HAPPY_PATH = ${escapeForScript(JSON.stringify(happyPathMeta))};
</script>
<script type="text/babel" data-presets="env,react">
const am = window.antdMobile || {};
const {
  Button, Form, Input, TextArea, Toast, NavBar, List, Selector, Dialog,
  ActionSheet, Tabs, Switch, Picker, Checkbox, Radio, Tag, Avatar, Card,
  Modal, Mask, Popup, Skeleton, ProgressBar, Stepper, ImageUploader,
  SearchBar, Slider, Steps,
} = am;

const ISLANDS = {
${islandsCode}
};

const HAPPY_PATH = window.__HM_HAPPY_PATH || [];

function findStateEl(k) {
  return document.querySelector('[data-state="' + k + '"]');
}

function clearReactInState(stateEl) {
  if (!stateEl) return;
  stateEl.querySelectorAll('[data-jsx-island][data-mounted="1"]').forEach(el => {
    try { el.__root && el.__root.unmount(); } catch (e) {}
    el.removeAttribute('data-mounted');
    el.__root = null;
    el.innerHTML = '';
  });
}

function mountReactInState(stateEl) {
  if (!stateEl) return;
  stateEl.querySelectorAll('[data-jsx-island]').forEach(el => {
    if (el.dataset.mounted === '1') return;
    const id = el.id;
    const Comp = ISLANDS[id];
    if (!Comp) {
      console.warn('[island] 未找到 JSX：' + id);
      return;
    }
    try {
      const root = ReactDOM.createRoot(el);
      el.__root = root;
      el.dataset.mounted = '1';
      root.render(<Comp />);
    } catch (e) {
      console.error('[island] 挂载 ' + id + ' 失败:', e);
    }
  });
}

let __currentState = null;

function renderStepper() {
  const box = document.getElementById('__hm-stepper');
  if (!box) return;
  const html = HAPPY_PATH.map((s, i) => {
    const cls = s.state_id === __currentState
      ? '__hm-step __active'
      : (HAPPY_PATH.findIndex(x => x.state_id === __currentState) > i ? '__hm-step __done' : '__hm-step');
    return '<span class="' + cls + '" data-jump-state="' + s.state_id + '">'
      + (i + 1) + '. ' + s.state_name + '</span>';
  }).join('');
  box.innerHTML = html + '<span class="__hm-hint">点击触发元素或步骤名称切换</span>';
}

function showState(k) {
  if (typeof k !== 'number' || Number.isNaN(k)) return;
  // 先卸载当前 state 的 React 树
  const prev = findStateEl(__currentState);
  if (prev) clearReactInState(prev);
  document.querySelectorAll('[data-state]').forEach(d => {
    d.style.display = (d.dataset.state === String(k)) ? '' : 'none';
  });
  __currentState = k;
  const curEl = findStateEl(k);
  if (curEl) mountReactInState(curEl);
  renderStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 文档级代理：data-next-state（trigger）+ data-jump-state（步骤条）
document.addEventListener('click', e => {
  const trig = e.target.closest('[data-next-state]');
  if (trig) {
    e.preventDefault();
    const next = parseInt(trig.getAttribute('data-next-state'), 10);
    if (!Number.isNaN(next)) showState(next);
    return;
  }
  const jump = e.target.closest('[data-jump-state]');
  if (jump) {
    const k = parseInt(jump.getAttribute('data-jump-state'), 10);
    if (!Number.isNaN(k)) showState(k);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  showState(${firstStateId});
});

window.__hmShowState = showState;
</script>
</body>
</html>`;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

module.exports = { buildInteractiveHtml };
