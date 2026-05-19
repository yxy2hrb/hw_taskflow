// ──────────────────────────────────────────────────────────────────────
// anchor selector 解析器
//
// 用途：让 skill1 输出的 anchor 字段支持两种模式：
//   ① literal 模式（旧）：完整 HTML 片段，patcher 直接当 [OLD] 字面值用
//   ② selector 模式（新）：写成 "#<id>"，由此模块在 base HTML 中抽取该
//      id 元素的整段（含开/闭标签、所有子节点），再作为 [OLD] 喂给 patcher
//
// 引入 selector 模式的目的：
//   - 杜绝 LLM 在 anchor 里随手写 "<div id=\"14_349770\" class=\"...\">...</div>"
//     这类带省略号的"伪 HTML"导致 patcher 永远找不到的硬伤；
//   - state-toggle / new-overlay 这类大块替换无需 LLM 把 5KB+ 子树复述出来，
//     token 极省，且天然避免错字 / 空白 / 属性顺序差异引起的 mismatch。
// ──────────────────────────────────────────────────────────────────────
"use strict";

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 在 baseHtml 中抽取 id="<id>" 的元素整段（含开/闭标签和所有子节点）。
 *
 * 算法：
 *   1. 用 regex 找到 `<tag ... id="ID" ...>` 开标签的位置；
 *   2. 若是自闭合（`/>` 或 void 元素）→ 直接返回开标签；
 *   3. 否则按 tag 名做平衡扫描（栈深度记数）找匹配的 </tag>。
 *
 * 注意：HTML 注释 / <script> / <style> 内部的伪标签会被错配，但 D2C 主体
 * 通常没有内嵌结构标签，对本工程足够。
 *
 * @returns {{ start:number, end:number, html:string, duplicates:number }|null}
 */
function extractByIdAttr(baseHtml, id) {
  if (!baseHtml || !id) return null;

  // 1. 找开标签：兼容单/双引号
  const startRe = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9-]*)\\b[^>]*?\\bid\\s*=\\s*["']${escapeRegex(id)}["'][^>]*>`,
    ""
  );
  const m = startRe.exec(baseHtml);
  if (!m) return null;

  const tag = m[1].toLowerCase();
  const startIdx = m.index;
  const openEnd = m.index + m[0].length;
  const openTagStr = m[0];

  // 统计同 id 出现次数（D2C 多 artboard 展开常见情况）
  const idOccRe = new RegExp(`\\bid\\s*=\\s*["']${escapeRegex(id)}["']`, "g");
  const duplicates = (baseHtml.match(idOccRe) || []).length;

  // 2. 自闭合
  if (openTagStr.endsWith("/>") || VOID_ELEMENTS.has(tag)) {
    return {
      start: startIdx,
      end: openEnd,
      html: baseHtml.slice(startIdx, openEnd),
      duplicates,
    };
  }

  // 3. 平衡扫描：在 openEnd 之后找匹配的 </tag>
  const tagRe = new RegExp(`<(/?)${tag}\\b([^>]*)>`, "gi");
  tagRe.lastIndex = openEnd;
  let depth = 1;
  let match;
  while ((match = tagRe.exec(baseHtml)) !== null) {
    const isClose = match[1] === "/";
    const attrs = match[2] || "";
    if (isClose) {
      depth--;
      if (depth === 0) {
        const end = match.index + match[0].length;
        return {
          start: startIdx,
          end,
          html: baseHtml.slice(startIdx, end),
          duplicates,
        };
      }
    } else {
      // 自闭合（<tag .../>）不增加 depth
      if (!attrs.trimEnd().endsWith("/")) depth++;
    }
  }
  return null;
}

/**
 * 把 anchor 字段解析为真实的 [OLD] 字符串。
 *
 * 输入约定：
 *   - "#xxx"           → selector 模式（必须能解析到 base 里的 id 元素）
 *   - 其他任何字符串    → literal 模式（原样返回，由 patcher 字面匹配）
 *
 * @returns {{
 *   ok: boolean,
 *   mode: "selector" | "literal" | "empty",
 *   realAnchor?: string,
 *   duplicates?: number,
 *   reason?: string,
 * }}
 */
function resolveAnchor(anchorOrSelector, baseHtml) {
  const raw = typeof anchorOrSelector === "string" ? anchorOrSelector.trim() : "";
  if (!raw) return { ok: false, mode: "empty", reason: "anchor 为空字符串" };

  // selector 形式：`#<id>`（id 字符集兼容 D2C 风格 14_349770、字母数字、下划线、连字符、点号、冒号）
  const selectorMatch = raw.match(/^#([A-Za-z0-9_:.\-]+)$/);
  if (selectorMatch) {
    const id = selectorMatch[1];
    const r = extractByIdAttr(baseHtml, id);
    if (!r) {
      return {
        ok: false,
        mode: "selector",
        reason: `selector "#${id}" 在 base HTML 中未找到 id="${id}" 的元素（疑似幻觉锚点）`,
      };
    }
    return {
      ok: true,
      mode: "selector",
      realAnchor: r.html,
      duplicates: r.duplicates > 1 ? r.duplicates : 0,
    };
  }

  // 退化容错：LLM 偶尔写 "div#xxx" 或 "id=xxx"，温和提示并按 selector 处理
  const looseSelector = raw.match(/^[a-zA-Z]*#([A-Za-z0-9_:.\-]+)$/) || raw.match(/^id\s*=\s*["']?([A-Za-z0-9_:.\-]+)["']?$/);
  if (looseSelector) {
    const id = looseSelector[1];
    const r = extractByIdAttr(baseHtml, id);
    if (r) {
      return {
        ok: true,
        mode: "selector",
        realAnchor: r.html,
        duplicates: r.duplicates > 1 ? r.duplicates : 0,
      };
    }
    // 没解析到就回退继续走 literal 通路
  }

  // 末路防御：anchor 内含省略号 → 大概率不会匹配，直接报错（与铁律 D 协同）
  if (raw.includes("...") || raw.includes("…")) {
    return {
      ok: false,
      mode: "literal",
      reason: "anchor 含省略号 (...) — literal 模式下永远找不到。请改用 \"#<id>\" 简写。",
    };
  }

  // 防御：literal 锚点必须是真正的 HTML 片段（含 "<"）。
  // v9 test3 state_5 翻车原因：LLM 把 anchor 写成 "script"（裸 tag 名），
  // 在 <head> 的 `<script src="..."` 开标签里命中 4 个字符，被 patcher 切进 script
  // 属性区，整个 Toast HTML 被吞进 script 标签 → 截图无 Toast。
  //
  // 真实 HTML 片段一定带 "<"；不带 "<" 的字符串都是"裸关键字"，无论 token 多长都不允许：
  //   "script" / "div" / "body" / "footer" / "</body>" 等
  // 也屏蔽掉 LLM 偶尔写的 `</script>` `</body>` 之类纯闭标签关键字（同样有歧义）。
  if (!raw.includes("<")) {
    return {
      ok: false,
      mode: "literal",
      reason: `anchor "${raw.length > 40 ? raw.slice(0, 40) + "…" : raw}" 不是合法的 HTML 片段（不含 "<"）— 不能用裸 tag 名/关键字作 literal 锚点。请改用 "#<id>" 简写或拷贝 base 里完整的 \`<tag ...>...</tag>\` 片段。`,
    };
  }

  return { ok: true, mode: "literal", realAnchor: raw };
}

/**
 * 多 id anchor 解析。
 *
 * 用于"最小修改"策略：state-toggle 时 LLM 可以列出**多个**会被影响的 id 段，
 * 配合 replace_at 指出 NEW_CODE 应当插入到哪一段；其他段直接删除。
 * 这样可以避开"选一个超大 frame 把状态栏/顶导/底导一起替换"的事故。
 *
 * 输入：
 *   - anchor 可以是字符串（单 id / literal）或字符串数组（多 id）
 *   - replaceAt 是 anchor 数组里某一个，指明 NEW_CODE 落点（默认 anchor[0]）
 *
 * 输出：
 *   - ok / mode 与 resolveAnchor 一致
 *   - resolved: Array<{ id, realAnchor, isReplaceAt }>
 *
 * 校验：
 *   - 每个 id 在 base 必须能解析到
 *   - replaceAt 必须出现在 anchor 数组里
 *
 * @returns {{
 *   ok: boolean,
 *   mode: "multi-selector" | "selector" | "literal" | "empty",
 *   resolved?: Array<{ id: string, realAnchor: string, isReplaceAt: boolean }>,
 *   realAnchor?: string,    // 兼容旧字段：等于 resolved[replaceIdx].realAnchor
 *   duplicates?: number,
 *   reason?: string,
 * }}
 */
function resolveAnchorMulti(anchor, baseHtml, replaceAt) {
  // 数组形式：多 id 锚
  if (Array.isArray(anchor)) {
    const ids = anchor.map(s => typeof s === "string" ? s.trim() : "").filter(Boolean);
    if (!ids.length) return { ok: false, mode: "empty", reason: "anchor 数组为空" };
    if (ids.length === 1) {
      // 退化为单 id 处理，沿用 resolveAnchor
      return resolveAnchor(ids[0], baseHtml);
    }
    // 1. 解析每个 id，拿到 base 里的 [start, end] 范围
    const resolvedRaw = [];
    for (const idRef of ids) {
      const r = resolveAnchor(idRef, baseHtml);
      if (!r.ok) {
        return {
          ok: false,
          mode: "multi-selector",
          reason: `多 id 锚里 "${idRef}" 解析失败：${r.reason}`,
        };
      }
      if (r.mode !== "selector") {
        return {
          ok: false,
          mode: "multi-selector",
          reason: `多 id 锚里 "${idRef}" 必须是 "#id" 形式（不允许 literal）`,
        };
      }
      // 重新拿到精确 [start, end]（resolveAnchor 不返回，这里直接用 extractByIdAttr）
      const raw = extractByIdAttr(baseHtml, idRef.replace(/^#/, ""));
      if (!raw) {
        return {
          ok: false,
          mode: "multi-selector",
          reason: `多 id 锚里 "${idRef}" 二次抽取失败`,
        };
      }
      resolvedRaw.push({
        id: idRef,
        start: raw.start,
        end: raw.end,
        realAnchor: r.realAnchor,
        isReplaceAt: false,
      });
    }
    // 2. 嵌套去重：若 A 的 [startA,endA] 完全包含 B 的 [startB,endB]，
    //    则保留 A 作为有效锚，B 被丢弃（B 已经在 A 内部，再删 B 会破坏 patcher
    //    的倒序位置计算，导致后续 </body> 等闭合标签被截断）。
    const dropped = new Set();
    for (let i = 0; i < resolvedRaw.length; i++) {
      if (dropped.has(i)) continue;
      for (let j = 0; j < resolvedRaw.length; j++) {
        if (i === j || dropped.has(j)) continue;
        const a = resolvedRaw[i], b = resolvedRaw[j];
        // a 完全包含 b → 丢弃 b
        if (a.start <= b.start && b.end <= a.end) {
          dropped.add(j);
        }
      }
    }
    const resolved = resolvedRaw.filter((_, i) => !dropped.has(i));
    // 3. 决定 replaceAt（兼容被去重的情况）
    const replaceIdRaw = typeof replaceAt === "string" && replaceAt.trim() ? replaceAt.trim() : ids[0];
    let replaceIdx = resolved.findIndex(x => x.id === replaceIdRaw);
    if (replaceIdx < 0) {
      // replace_at 被嵌套去重去掉了——找包含它的外层段
      const dropEntry = resolvedRaw.find(x => x.id === replaceIdRaw);
      if (dropEntry) {
        const wrapIdx = resolved.findIndex(x => x.start <= dropEntry.start && dropEntry.end <= x.end);
        if (wrapIdx >= 0) replaceIdx = wrapIdx;
      }
    }
    if (replaceIdx < 0) {
      return {
        ok: false,
        mode: "multi-selector",
        reason: `replace_at "${replaceIdRaw}" 不在 anchor 数组中`,
      };
    }
    resolved[replaceIdx].isReplaceAt = true;
    // 4. 单 id 退化（去重后只剩 1 个）
    if (resolved.length === 1) {
      return {
        ok: true,
        mode: "selector",
        realAnchor: resolved[0].realAnchor,
      };
    }
    // 5. F12 覆盖率检测：dedup 之后任一段长度若占 body > 60%，
    //    通常意味着 LLM 选了顶层 frame（含 NavBar / 状态栏 / 底导子树），
    //    替换它会卷走 base chrome。这里只记录 warning 字段，由调用方决定后续处理。
    let maxBodyCoverage = 0;
    let largestSegmentId = null;
    const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(baseHtml);
    const bodyLen = bodyMatch ? bodyMatch[1].length : baseHtml.length;
    for (const seg of resolved) {
      const cov = seg.realAnchor.length / Math.max(1, bodyLen);
      if (cov > maxBodyCoverage) {
        maxBodyCoverage = cov;
        largestSegmentId = seg.id;
      }
    }
    return {
      ok: true,
      mode: "multi-selector",
      resolved: resolved.map(({ id, realAnchor, isReplaceAt }) => ({ id, realAnchor, isReplaceAt })),
      realAnchor: resolved[replaceIdx].realAnchor,
      droppedNested: dropped.size,
      maxBodyCoverage,
      largestSegmentId,
    };
  }
  // 字符串形式：旧逻辑
  return resolveAnchor(anchor, baseHtml);
}

module.exports = {
  resolveAnchor,
  resolveAnchorMulti,
  extractByIdAttr,
};
