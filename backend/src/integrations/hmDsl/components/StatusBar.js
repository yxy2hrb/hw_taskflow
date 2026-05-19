"use strict";
/**
 * StatusBar - 顶部系统状态栏（默认 32px，08:08 / 信号 / 4G / 电量 100）。
 *
 * props:
 *   time?: string        默认 "08:08"
 *   signal?: string      默认 "5G"（不渲染图标条数，只渲染文字 + 信号点）
 *   battery?: number     默认 100
 *   height?: number      默认 32
 *   background?: string  默认 transparent（让 base 颜色透出来；纯 overlay 时可能要给）
 *
 * 设计要点：
 *   - 内容用 flex space-between，左侧时间，右侧 4G + 电池
 *   - 字体小（12px）、颜色 textPrimary
 *   - 不画 wifi/信号小图标（v0 简化），用文字"5G/4G/Wi-Fi"代替
 */

const { color: C, font: F, spacing: S, safeArea } = require("../tokens");
const { p } = require("../utils");

function StatusBar(props) {
  const time = p(props, "time", "08:08");
  const signal = p(props, "signal", "5G");
  const battery = p(props, "battery", 100);
  const h = p(props, "height", safeArea.statusBarHeight);
  const bg = p(props, "background", "transparent");

  return `<div data-hm="StatusBar" style="position:relative;height:${h}px;padding:0 ${S.lg}px;display:flex;align-items:center;justify-content:space-between;background:${bg};color:${C.textPrimary};font-family:${F.family};font-size:${F.sizeSm}px;font-weight:${F.weightMedium};box-sizing:border-box;">
  <span>${escapeText(time)}</span>
  <div style="display:flex;align-items:center;gap:${S.xs}px;">
    <span style="display:inline-flex;align-items:center;gap:1px;">
      <span style="width:3px;height:6px;background:currentColor;border-radius:1px;"></span>
      <span style="width:3px;height:9px;background:currentColor;border-radius:1px;"></span>
      <span style="width:3px;height:12px;background:currentColor;border-radius:1px;"></span>
    </span>
    <span style="font-weight:${F.weightMedium};">${escapeText(signal)}</span>
    <span style="display:inline-flex;align-items:center;gap:2px;margin-left:${S.xs}px;">
      <span style="width:22px;height:11px;border:1px solid currentColor;border-radius:3px;padding:1px;box-sizing:border-box;display:inline-flex;align-items:center;">
        <span style="display:block;width:${Math.max(0, Math.min(100, Number(battery)))}%;height:100%;background:currentColor;border-radius:1px;"></span>
      </span>
      <span style="width:2px;height:5px;background:currentColor;border-radius:0 1px 1px 0;"></span>
      <span style="font-size:${F.sizeXs}px;font-weight:${F.weightMedium};margin-left:2px;">${battery}</span>
    </span>
  </div>
</div>`;
}

function escapeText(s) { return String(s).replace(/[<>&"]/g, ch => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;" }[ch])); }

module.exports = StatusBar;
