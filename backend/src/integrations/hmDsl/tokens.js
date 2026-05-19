"use strict";
/**
 * HarmonyOS 设计 Token（v0）
 *
 * 这里集中存放所有色值/字号/圆角/间距/阴影。组件实现里禁止再硬编码这些常量，
 * 必须从此处取。改主题色 / 切暗模式只在本文件改一次。
 */

const color = {
  primary: "#0A59F7",
  primaryHover: "#0040C9",
  onPrimary: "#FFFFFF",

  background: "#F5F5F5",
  surface: "#FFFFFF",

  textPrimary: "rgba(0,0,0,0.90)",
  textSecondary: "rgba(0,0,0,0.60)",
  textTertiary: "rgba(0,0,0,0.40)",
  textDisabled: "rgba(0,0,0,0.20)",

  border: "rgba(0,0,0,0.08)",
  divider: "rgba(0,0,0,0.05)",

  iconPrimary: "rgba(0,0,0,0.90)",
  iconSecondary: "rgba(0,0,0,0.60)",
  iconBrand: "#0A59F7",

  bgIconSolid: "#F1F3F5",    // 图标圆背景
  bgChipHover: "#EEF4FF",    // chip 选中 hover

  warning: "#E84026",
  warningSoft: "#FEE9E5",
  success: "#1C7F00",
};

const radius = { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, pill: 9999 };

const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

const font = {
  family: "HarmonyHeiTi,'HarmonyOS Sans',sans-serif",
  sizeXs: 10,
  sizeSm: 12,
  sizeMd: 14,
  sizeLg: 16,
  sizeXl: 18,
  sizeXxl: 20,
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
};

const shadow = {
  light: "0 2px 8px rgba(0,0,0,0.06)",
  medium: "0 4px 16px rgba(0,0,0,0.10)",
  dialog: "0 10px 30px rgba(0,0,0,0.20)",
  card: "0 1px 4px rgba(0,0,0,0.06)",
};

const viewport = { width: 360, height: 780 };

const safeArea = {
  statusBarHeight: 32,
  navBarHeight: 56,
  bottomTabHeight: 56,
};

module.exports = { color, radius, spacing, font, shadow, viewport, safeArea };
