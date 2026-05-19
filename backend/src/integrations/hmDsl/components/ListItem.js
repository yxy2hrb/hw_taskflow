"use strict";
/**
 * ListItem - 列表项（左 icon + 标题 + 副标题 + 右 slot）。
 *
 * props:
 *   title: string                 必填
 *   subtitle?: string             可选
 *   leftIcon?: string             可选（Material name）
 *   leftIconBg?: string           默认 bgIconSolid
 *   leftIconColor?: string        默认 iconPrimary
 *   right?: HMNode | string       右侧 slot（任意子节点或文本）；可由 children 传入
 *   height?: number               默认 64
 *   divider?: boolean             默认 true
 *
 * children: 可作为 right slot 的子节点（如 Checkbox / Icon）
 */

const { color: C, font: F, spacing: S, radius: R } = require("../tokens");
const { p, escapeHtml, normalizeIconName } = require("../utils");

function ListItem(props, childrenHtml) {
  const title = String(p(props, "title", ""));
  const subtitle = p(props, "subtitle", null);
  const leftIcon = normalizeIconName(p(props, "leftIcon", null));
  const leftIconBg = p(props, "leftIconBg", C.bgIconSolid);
  const leftIconColor = p(props, "leftIconColor", C.iconPrimary);
  const h = Number(p(props, "height", 64));
  const divider = !!p(props, "divider", true);

  const left = leftIcon
    ? `<div style="width:40px;height:40px;border-radius:${R.pill}px;background:${leftIconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span class="mi" style="font-size:22px;color:${leftIconColor};">${escapeHtml(leftIcon)}</span>
      </div>`
    : "";

  const titleHtml = `<div style="font-family:${F.family};font-size:${F.sizeLg}px;font-weight:${F.weightMedium};color:${C.textPrimary};line-height:1.3;">${escapeHtml(title)}</div>`;
  const subtitleHtml = subtitle
    ? `<div style="font-family:${F.family};font-size:${F.sizeSm}px;color:${C.textSecondary};line-height:1.3;margin-top:2px;">${escapeHtml(subtitle)}</div>`
    : "";

  const borderBottom = divider ? `border-bottom:1px solid ${C.divider};` : "";

  return `<div data-hm="ListItem" style="min-height:${h}px;padding:${S.md}px ${S.lg}px;display:flex;align-items:center;gap:${S.md}px;background:${C.surface};${borderBottom}box-sizing:border-box;">
  ${left}
  <div style="flex:1;min-width:0;">
    ${titleHtml}
    ${subtitleHtml}
  </div>
  <div style="flex-shrink:0;display:flex;align-items:center;">${childrenHtml}</div>
</div>`;
}

module.exports = ListItem;
