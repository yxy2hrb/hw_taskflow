"use strict";
/**
 * 把编译产物注入 base HTML，三种模式：
 *   overlay   - 在 </body> 之前挂一个 fixed 容器（默认）
 *   replace   - 用 CSS selector 找到目标元素，替换其 outerHTML
 *   append    - 用 CSS selector 找到目标元素，在其后追加
 *
 * 设计原则：
 *   - 永远不动 base 内的 <style> 块
 *   - 永远在 outer wrapper 上加 namespace id `hm-dsl-root-st<state_id>`
 *   - 默认 z-index = 9999；可由 injection.z_index 覆盖
 *
 * 注：replace / append 的 CSS selector 匹配是"轻量级"实现——只支持
 *    `#id`、`.class`、`[attr="value"]`、`tag` 几种基础选择器（不引入 cheerio）。
 *    任何匹配失败都会抛 HMDslError，让上层走 fallback。
 */

const { HMDslError } = require("./validate");

function wrapWithTaskComment(innerHtml, stateName, lifecycle) {
  const tag = lifecycle === "persistent" ? "持久" : "临时";
  return `<!-- 任务节点开始: ${stateName}【${tag}】 -->\n${innerHtml}\n<!-- 任务节点结束: ${stateName}【${tag}】 -->`;
}

function buildOverlayWrapper(innerHtml, stateId, zIndex, edges) {
  const rootId = `hm-dsl-root-st${stateId ?? "x"}`;
  const top = (edges && edges.top) || 0;
  const right = (edges && edges.right) || 0;
  const bottom = (edges && edges.bottom) || 0;
  const left = (edges && edges.left) || 0;
  // overlay 容器自身只在指定的边界内覆盖；这样可保留 base 的状态栏/底 Tab 可见。
  return `<div id="${rootId}" data-hm-dsl="1" style="position:fixed;top:${top}px;right:${right}px;bottom:${bottom}px;left:${left}px;z-index:${zIndex};pointer-events:auto;font-family:HarmonyHeiTi,'HarmonyOS Sans',sans-serif;">${innerHtml}</div>`;
}

/**
 * anchor 失败回落 overlay 专用 wrapper：
 *   - 不写 bottom，height 自适应
 *   - 贴在状态栏下方（top=32）
 *   - 左右贴边、加 padding，呈现"顶部 Toast/Banner"效果
 *
 * 这样即便 LLM 选错 anchor，错误提示/单行 banner 等内容也会显示在合理位置而非屏幕左上角。
 */
function buildTopBannerWrapper(innerHtml, stateId, zIndex) {
  const rootId = `hm-dsl-root-st${stateId ?? "x"}`;
  // 只看"含哪些组件 + 用了哪些主题色"判断卡片底色，避免被 state_name / 任意文本误伤：
  //   - 内容里有 FieldError 组件，或样式里出现警告色 → 浅红卡片
  //   - 否则白色卡片
  const hasError = /data-hm="FieldError"/.test(innerHtml)
    || /color:#E84026|background:#FEE9E5/.test(innerHtml);
  const cardBg = hasError ? "#FEE9E5" : "rgba(255,255,255,0.98)";
  const cardBorder = hasError ? "#E84026" : "rgba(0,0,0,0.08)";
  // Banner 自带卡片底色，外层不再叠加，避免双层卡片。
  const hasBanner = /data-hm="Banner"/.test(innerHtml);
  const cardStyle = hasBanner
    ? ""
    : `background:${cardBg};border:1px solid ${cardBorder};border-radius:8px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,0.10);`;
  return `<div id="${rootId}" data-hm-dsl="1" data-hm-fallback="top-banner" style="position:fixed;top:40px;left:16px;right:16px;z-index:${zIndex};${cardStyle}pointer-events:auto;font-family:HarmonyHeiTi,'HarmonyOS Sans',sans-serif;display:flex;flex-direction:column;align-items:stretch;gap:8px;">${innerHtml}</div>`;
}

function injectIntoBase(baseHtml, renderedHtml, root, ctx) {
  const stateId = ctx.stateId;
  const lifecycle = root.lifecycle;
  const stateName = root.state_name;
  const injection = root.injection || { mode: "overlay" };
  const zIndex = (injection.z_index != null) ? injection.z_index : 9999;

  const wrapped = wrapWithTaskComment(renderedHtml, stateName, lifecycle);

  if (injection.mode === "overlay") {
    const edges = {
      top: injection.top || 0,
      right: injection.right || 0,
      bottom: injection.bottom || 0,
      left: injection.left || 0,
    };
    const overlay = buildOverlayWrapper(wrapped, stateId, zIndex, edges);
    if (!/<\/body>/i.test(baseHtml)) throw new HMDslError("base HTML 缺少 </body>");
    return baseHtml.replace(/<\/body>/i, `${overlay}\n</body>`);
  }

  if (injection.mode === "replace" || injection.mode === "append") {
    try {
      const re = compileSelectorRe(injection.anchor);
      const m = baseHtml.match(re.openTag);
      if (!m) throw new HMDslError(`${injection.mode} anchor "${injection.anchor}" 未命中 base`);
      const endIdx = findElementEnd(baseHtml, m.index, m[0]);
      if (endIdx < 0) throw new HMDslError(`${injection.mode} anchor "${injection.anchor}" 元素无闭合`);
      if (injection.mode === "replace") return baseHtml.slice(0, m.index) + wrapped + baseHtml.slice(endIdx);
      return baseHtml.slice(0, endIdx) + wrapped + baseHtml.slice(endIdx);
    } catch (e) {
      // F14 (v29 起): anchor 未命中时**不再** fallback 到顶部 Banner overlay。
      // 旧策略把 LLM 给的内容硬塞到屏幕顶部 banner 位置，但当 LLM 给的是
      // "loading 按钮 / spinner / 错误提示" 这类**就地状态变化**时，banner
      // 会跟 base 原按钮形成"顶+底两个按钮"的尴尬错位
      // （v29 new_test/2 state_4 翻车现场：LLM 给 injection.mode=replace +
      //  anchor=#submit-button，base 不存在 → fallback → 顶部蓝色 loading
      //  按钮 + base 红色"确认"按钮 同时显示）。
      //
      // 改为：anchor 未命中直接抛错，由上层 patchOneState try/catch 后回落
      // 到 legacy 路径（legacy 让 LLM 自由生成完整 HTML），无错位。
      if (ctx && ctx.log) ctx.log(`anchor 未命中(${e.message})，放弃 DSL 路径，让上层走 legacy`);
      throw new HMDslError(`${injection.mode} anchor "${injection.anchor}" 未命中 base，放弃 DSL（让上层回落到 legacy）`);
    }
  }

  throw new HMDslError(`未知 injection.mode: ${injection.mode}`);
}

/** 轻量级 CSS selector → RegExp（仅支持 `#id`、`.class`、`tag`、`tag.class`、`tag#id` 组合）。 */
function compileSelectorRe(sel) {
  if (!sel || typeof sel !== "string") throw new HMDslError(`非法 selector: ${sel}`);
  let tag = "[a-z][a-z0-9]*";
  let attrTest = "";
  // 允许 unicode 字符（包括中文）作为 id/class 名片段，但若 sel 含 # 或 . 却解析不出
  // 有效片段，则直接抛错让 fallback 接管，避免误匹配第一个 <tag>。
  const NAME_RE = /[\w\u00A0-\uFFFF-]+/;
  const idMatch = sel.match(new RegExp(`#(${NAME_RE.source})`));
  const clsMatch = sel.match(new RegExp(`\\.(${NAME_RE.source})`));
  const tagMatch = sel.match(/^([a-zA-Z][\w-]*)/);
  if (tagMatch) tag = tagMatch[1];
  if (idMatch) attrTest += `(?=[^>]*\\bid="${escapeReStr(idMatch[1])}")`;
  else if (sel.includes("#")) throw new HMDslError(`selector 含 # 但无法解析 id: ${sel}`);
  if (clsMatch) attrTest += `(?=[^>]*\\bclass="[^"]*\\b${escapeReStr(clsMatch[1])}\\b)`;
  else if (sel.includes(".")) throw new HMDslError(`selector 含 . 但无法解析 class: ${sel}`);
  // 没任何有效片段（既无 tag/id/class）→ 抛错，避免误匹配
  if (!tagMatch && !idMatch && !clsMatch) {
    throw new HMDslError(`selector 无可识别片段: ${sel}`);
  }
  const openTag = new RegExp(`<${tag}\\b${attrTest}[^>]*>`, "i");
  return { openTag, tag };
}

function escapeReStr(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 给定一段 HTML 与某个开始 tag 的位置，找其匹配的结束位置（包含闭合 tag）。 */
function findElementEnd(html, startIdx, openTagStr) {
  const tagMatch = openTagStr.match(/^<([a-z][\w-]*)/i);
  if (!tagMatch) return -1;
  const tag = tagMatch[1].toLowerCase();
  // 自闭合（如 <img/>）
  if (/\/\s*>$/.test(openTagStr) || VOID_ELEMENTS.has(tag)) {
    return startIdx + openTagStr.length;
  }
  let i = startIdx + openTagStr.length;
  let depth = 1;
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, "ig");
  const closeRe = new RegExp(`</${tag}\\s*>`, "ig");
  while (i < html.length && depth > 0) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; i = o.index + o[0].length; }
    else { depth--; i = c.index + c[0].length; }
  }
  return depth === 0 ? i : -1;
}

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

module.exports = { injectIntoBase, wrapWithTaskComment, buildOverlayWrapper, buildTopBannerWrapper };
