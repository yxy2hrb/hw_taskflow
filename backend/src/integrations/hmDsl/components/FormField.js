"use strict";
/**
 * FormField - 表单字段复合组件（label + 控件 + 可选错误文本）。
 *
 * 专门解决「行内字段校验失败」场景：LLM 只需要写一个 FormField 节点描述
 * 「字段名 / 输入框 / 错误提示」，编译器负责把它渲染成 HarmonyOS 规范的字段块。
 *
 * props:
 *   label?: string                顶部字段名（不传则不显示）
 *   required?: boolean            是否在 label 前显示红色 *
 *   error?: string                错误文本（有值时输入框边框变红 + 下方红字提示）
 *   helper?: string               辅助文字（与 error 互斥；有 error 时优先 error）
 *   labelWidth?: number           >0 时改成横向布局（label 在左），默认 0 纵向
 *   gap?: number                  label 与控件的间距，默认 6
 *
 *   // 简易模式：直接用内置 TextInput 渲染
 *   placeholder?: string
 *   value?: string
 *   icon?: string                 左侧图标
 *   suffix?: string               右侧图标
 *   inputSize?: "compact"|"regular"|"large"  默认 regular
 *
 *   // 高级模式：自定义控件（如 Checkbox/SegmentedTabs/Picker），放入 children
 *   children?: HMNode[]
 */

const { color: C, font: F, spacing: S } = require("../tokens");
const { p, escapeHtml } = require("../utils");
const TextInput = require("./TextInput");
const FieldError = require("./FieldError");

function FormField(props, childrenHtml, ctx) {
  const label = p(props, "label", null);
  const required = !!p(props, "required", false);
  const error = p(props, "error", null);
  const helper = p(props, "helper", null);
  const labelWidth = Number(p(props, "labelWidth", 0));
  const gap = Number(p(props, "gap", 6));

  const hasError = !!(error && String(error).trim());

  // children 优先于内置 TextInput
  let controlHtml = (childrenHtml || "").trim();
  if (!controlHtml) {
    controlHtml = TextInput({
      placeholder: p(props, "placeholder", ""),
      value: p(props, "value", ""),
      icon: p(props, "icon", null),
      suffix: p(props, "suffix", null),
      size: p(props, "inputSize", "regular"),
      invalid: hasError,
      block: true,
    });
  }

  const star = required
    ? `<span style="color:${C.warning};margin-right:2px;">*</span>`
    : "";
  const labelHtml = label
    ? `<div data-hm="FormFieldLabel" style="font-family:${F.family};font-size:${F.sizeSm}px;color:${C.textSecondary};line-height:1.4;">${star}${escapeHtml(label)}</div>`
    : "";

  let bottomHtml = "";
  if (hasError) {
    bottomHtml = FieldError({ text: error, marginTop: 4 });
  } else if (helper) {
    bottomHtml = `<div style="margin-top:4px;font-family:${F.family};font-size:${F.sizeSm}px;color:${C.textTertiary};line-height:1.4;">${escapeHtml(helper)}</div>`;
  }

  if (labelWidth > 0) {
    return `<div data-hm="FormField" style="display:flex;flex-direction:column;width:100%;">
      <div style="display:flex;align-items:center;gap:${S.md}px;">
        <div style="width:${labelWidth}px;flex-shrink:0;">${labelHtml}</div>
        <div style="flex:1;min-width:0;">${controlHtml}</div>
      </div>
      ${bottomHtml ? `<div style="margin-left:${labelWidth + S.md}px;">${bottomHtml}</div>` : ""}
    </div>`;
  }

  return `<div data-hm="FormField" style="display:flex;flex-direction:column;gap:${gap}px;width:100%;">
    ${labelHtml}
    ${controlHtml}
    ${bottomHtml}
  </div>`;
}

module.exports = FormField;
