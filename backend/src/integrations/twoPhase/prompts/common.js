// ──────────────────────────────────────────────────────────────────────
// twoPhase 公共 prompt 资产：语言检测提示 + 关键 10 条核心约束 + 鸿蒙规范摘要
// ──────────────────────────────────────────────────────────────────────
"use strict";

/** 从旧 taskflowPatch.js 同步过来的语言检测（复用语义，独立实现避免循环引用） */
function detectLanguage(html) {
  const bodyMatch = (html || "").match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : (html || "");
  const stripped = body
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/style\s*=\s*"[^"]*"/gi, " ")
    .replace(/class\s*=\s*"[^"]*"/gi, " ")
    .replace(/id\s*=\s*"[^"]*"/gi, " ")
    .replace(/(alt|placeholder|title)\s*=\s*"([^"]*)"/gi, " $2 ")
    .replace(/<[^>]+>/g, " ");
  const cn = (stripped.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (stripped.match(/[A-Za-z]{2,}/g) || []).length;
  let primary;
  if (cn === 0 && en > 0) primary = "en";
  else if (cn > 0 && en === 0) primary = "zh";
  else if (cn >= en * 2) primary = "zh";
  else if (en >= cn * 2) primary = "en";
  else primary = "mixed";
  return { primary, cn, en };
}

function languageHint(primary) {
  if (primary === "en") {
    return "本页面主语言：英文。所有新生成的可见文案必须用英文（如 Cancel / Confirm / Cancelling…），禁止突然出现中文。";
  }
  if (primary === "zh") {
    return "本页面主语言：中文。所有新生成的可见文案必须用中文，禁止突然出现英文（除非原页面本就有英文术语如 Tab 名）。";
  }
  return "本页面是中英混排：保持原页面的语言风格，控件标签按原页面里使用的那种语言。";
}

/**
 * 关键 10 条核心约束（从原 27 条中精选）。所有 skill1/skill2 prompt 公用。
 * 这些是"无论改什么类型的 patch 都不能违反"的硬规则。
 */
const CORE_10_RULES = `==================【核心 10 条 - 硬约束（违反即作废）】==================
1) 输出格式：只允许 [OLD] / [NEW] 块，每对一个替换；禁止 Markdown / 自然语言 / 代码块标记 / [/OLD][/NEW]。
2) OLD 必须逐字来自当前 HTML：原文照抄、空格/注释/属性顺序保持一致；禁止补全、改写、新增、省略任何字符。
3) 锚点白名单：禁止用 <script></script>、空 <div>、<head>、<style> 等"无业务语义节点"作为 OLD 锚点。
4) 语言一致性：新生成的可见文案语种必须与原页面主语种一致（具体见下方"页面语言"提示）。
5) 任务节点【临时】注释：所有新增的可见浮层/弹窗/Toast/Snackbar/全屏覆盖页，必须用
     <!-- 任务节点开始: <当前 state_name>【临时】 -->...<!-- 任务节点结束: <当前 state_name>【临时】 -->
   包裹，方便下一态自动隐藏；且 <当前 state_name> 必须逐字等于本任务的 state_name。
6) OLD 完整性：当任务是"重写区域 / 替换卡片 / 切换列表"时，OLD 必须包带 id 的最外层 D2C 容器
   （形如 <div id="N_NNN" class="Pixso-frame-N_NNN">...完整子树...</div>），不能只取子节点。
7) 原地状态变化：当任务是"原按钮变 X / toggle 切换 / 输入框显示已输入值"等"原元素状态切换"时，
   必须用 OLD 包住"原页面里那个真实元素的完整 HTML 片段"；禁止仅在 body 末尾追加 fixed 浮层来"模拟"。
8) 覆盖即隐藏：D2C 设计稿常把多状态同时画出，导致同一卡片在原 HTML 中出现 2~3 份。
   当任务要"重写/隐藏 X 卡片"时，必须为每一份副本各发一个 [OLD][NEW] 块，把残余副本加 style="display:none"。
9) DOM ID 不冲突：[NEW] 中若复刻状态栏/导航栏/底部 Tab 等系统骨架，禁止复用原 base 的 Pixso id（如 id="6_7924"）；
   要么用本 state 的 namespace（如 id="hm-stN-statusbar"），要么不写 id 只用 inline style。
10) 图标 & 字体：图标统一写 <span class="mi" style="...">icon_name</span>（Material Icons Round 名），禁止 Emoji；
    字体声明 HarmonyHeiTi, 'HarmonyOS Sans', sans-serif；所有样式必须 inline style，禁止依赖 class 控制颜色字号。
============================================================================`;

/**
 * 鸿蒙规范摘要（精简版，给 state-toggle / new-overlay 用）。
 * 从 HARMONY_PATCH_GUIDE 中提取色板 + 圆角 + 阴影 + 字号 + 美学红线。
 */
const HM_DESIGN_SUMMARY = `==================【HarmonyOS Design 摘要】==================
色板（只用以下 token，写成 inline style 实色值）：
  - 品牌主色 #0A59F7（Primary 按钮、强调）
  - 警示色 #E84026（删除/失败）
  - 二级警示 #ED6F21（轻警告）
  - 成功 #64BB5C（Toast 成功）
  - 一级文本 rgba(0,0,0,0.90)
  - 二级文本 rgba(0,0,0,0.60)
  - 三级文本 rgba(0,0,0,0.40)
  - 反色文本 #FFFFFF
  - 一级背景 #FFFFFF（卡片/弹窗）
  - 二级背景 #F1F3F5（页面灰底）
  - 控件灰底 rgba(0,0,0,0.05)
  - 分割线 rgba(0,0,0,0.10)
  - 遮罩 rgba(0,0,0,0.40)
  ❌ 严禁渐变/纯黑#000/任意非 token 蓝（#1677FF#007DFF 都不合规）。

圆角：卡片/弹窗 16；按钮/标签 20；大对话框 32；搜索/输入 24；徽章 8。
字号：标题 20/700；正文/按钮 16/500；辅助 12~14/400。line-height 正文 1.5。
间距：4/8/12/16/24/32 px 倍数；弹窗内边距 24px；按钮高 40px；图标 20/24px。
阴影：卡片/弹窗 0 8px 24px rgba(0,0,0,0.08)；Toast 0 4px 12px rgba(0,0,0,0.06)。

美学红线：
  - 任何卡片/弹窗/Toast 必须有圆角+阴影+内边距；
  - 不允许裸 <button>/<input>/<hr> 默认外观；
  - 全屏 fixed panel 根容器必须**完全不透明**背景（#FFFFFF/#F1F3F5），禁止 rgba(0,0,0,0.x) 半透明（base 会穿透）；
  - 4+ 同类卡片必须用 CSS Grid（repeat(2|3, 1fr) + gap:16px），禁止 flex+overflow-x:auto 横向滚动；
  - 移动端画布 360px，弹窗 max-width:328px，box-sizing:border-box。
================================================================`;

module.exports = {
  detectLanguage,
  languageHint,
  CORE_10_RULES,
  HM_DESIGN_SUMMARY,
};
