"use strict";

const HIFI_RENDER_SYSTEM_PROMPT =
  "你是资深移动端 UI 工程师兼产品设计师，精通 React（无 JSX）代码生成和 2024-2025 年主流移动 App 视觉设计（微信、支付宝、小红书、Keep 等扁平简约风格）。" +
  "你生成的代码必须遵循：①所有颜色从 props.theme 对象（t.primary/t.surface/t.bg/t.text/t.border）取值，严禁硬编码色值；" +
  "②字体大小标题≤17px、正文13-14px、辅助11-12px，禁止使用serif/cursive字体；" +
  "③图标只使用class='mi'配合Material Icons Round的标准图标名；" +
  "④阴影轻盈（box-shadow:0 1px 8px rgba(0,0,0,0.04)），禁止厚重/3D阴影和渐变背景；" +
  "⑤严禁使用任何 Emoji 字符（如💧🌙🏃🌟🔥等），所有图标必须用 Material Icons，所有文案必须是纯文字（如'喝水 1200/2000ml'而非'💧 喝水'）；" +
  "⑥navItems 必须包含恰好5个导航项。" +
  "以 JSON 格式返回，不要输出 JSON 以外的任何内容，不要输出 markdown 代码块标记。";

// ── 框架 shell 区域（由沙盒统一渲染，AI 不生成）──────────────────────────────
const SHELL_SECTION_TYPES = new Set([
  "status_bar", "nav_bar", "navigation_bar", "app_bar",
  "bottom_nav", "tab_bar", "bottom_tab",
]);

// ── 将 sharedKey 转为合法 JS 函数名 ─────────────────────────────────────────
function toSharedFuncName(sharedKey) {
  return `Shared_${sharedKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * 将低保真线框转为区块指令。
 *
 * sharedComponents: { [funcName: string]: string }
 *   当前会话已生成并缓存的公共组件代码（key = 函数名，value = 完整函数声明字符串）。
 *   若某区块已有缓存代码，则直接注入 + 告知 AI 调用，不重新实现。
 */
function buildWireframeBodyInstruction(wireframe, sharedComponents = {}) {
  if (!Array.isArray(wireframe) || wireframe.length === 0) return "";

  const bodySections = wireframe.filter((s) => !SHELL_SECTION_TYPES.has(s.type));
  if (bodySections.length === 0) return "";

  const bodyRatioSum = bodySections.reduce((sum, s) => sum + s.heightRatio, 0);

  // 已预生成的公共组件代码（需注入 prompt）
  const preBuiltEntries = [];
  // 各区块的说明行
  const sectionLines = [];
  // render() 中的调用行
  const callParts = [];

  bodySections.forEach((s, i) => {
    const relPct = bodyRatioSum > 0 ? Math.round((s.heightRatio / bodyRatioSum) * 100) : 0;

    if (s.shared && s.sharedKey) {
      const funcName = toSharedFuncName(s.sharedKey);

      if (sharedComponents[funcName]) {
        // ── 已有缓存：注入原始代码，严禁 AI 重新实现 ──────────────────────
        preBuiltEntries.push(sharedComponents[funcName]);
        sectionLines.push(
          `  • 区块${i}: [${s.type}] "${s.label || s.type}"（公共组件 ${funcName}，已预生成，禁止重新实现，直接调用即可）`
        );
        callParts.push(`    R.createElement(${funcName},{t:t,u:u,ctx:props.ctx})`);
      } else {
        // ── 首次生成：要求 AI 使用 Shared_ 前缀命名，便于后续页面复用 ────
        sectionLines.push(
          `  • 区块${i}: [${s.type}] "${s.label || s.type}"（公共组件，占主体 ~${relPct}%）→ 命名为 function ${funcName}(p)【首次生成，其他页面会直接复用此代码，实现须精美且通用】`
        );
        callParts.push(`    R.createElement(${funcName},{t:t,u:u,ctx:props.ctx})`);
      }
    } else {
      // ── 私有区块：按页面功能独立实现 ─────────────────────────────────────
      sectionLines.push(
        `  • 区块${i}: [${s.type}] 布局用途=[${s.label || s.type}]（私有区块，占主体 ~${relPct}%）→ function Section${i}(p)\n` +
        `    ⚠ 内容生成规则（严格执行）：\n` +
        `       1. [布局用途]是结构描述，禁止作为区块标题、小标题或任何可见文字输出。\n` +
        `       2. 功能列表中的功能描述文本（如"切换查看历史/未来日期""查看各项任务进度"）禁止原样复制为标题或列表项。\n` +
        `       3. 区块内的标题/小标题必须是该区域的语义名称（如"今日健康""打卡记录"），不是功能描述。\n` +
        `       4. 列表项/数据展示必须是具体业务数值（如"喝水 1200/2000ml""睡眠 7h30min"），不是功能点名称。\n` +
        `       5. 按钮/操作文字必须是简短动作词（如"打卡""记录""完成 ✓"），不是功能描述片段。`
      );
      callParts.push(`    R.createElement(Section${i},{t:t,u:u,ctx:props.ctx})`);
    }
  });

  // 预注入区域（已缓存的公共组件代码，原样放入 prompt）
  const preBuiltSection =
    preBuiltEntries.length > 0
      ? "【已预生成公共组件（原样复制到 renderCode 开头，不得修改）】\n" +
        preBuiltEntries.join("\n") +
        "\n\n"
      : "";

  return (
    preBuiltSection +
    "【低保真线框图主体区域 — 严格按以下顺序逐一实现对应组件】\n" +
    "（TopBar 和 BottomNav 由框架自动添加，render() 只返回以下区块的拼接，不要包含顶部导航和底部导航！）\n" +
    "⚠ 重要：区块的[布局用途]标签（如[快捷操作区][今日待办][数据概览]）是描述区域用途的内部标注，\n" +
    "   严禁将其原样输出为卡片标题、按钮文字、小标题等任何可见UI文案。\n" +
    "   所有可见文案必须从上方[核心功能]列表提炼，体现具体的业务操作与数据。\n\n" +
    sectionLines.join("\n") +
    "\n\n" +
    "render(props) 必须按以上顺序调用各区块：\n" +
    "function render(props){\n" +
    "  var R=React,\n" +
    '    t=Object.assign({primary:"#3B82F6",surface:"#fff",bg:"#f5f7fa",text:"#1a2540",border:"#e8edf5"},props.theme||{}),\n' +
    "    u=props.uiContent||{};\n" +
    '  return R.createElement("div",{style:{background:t.bg}},\n' +
    callParts.join(",\n") +
    "\n  );\n}\n\n"
  );
}

// ── 主函数 ────────────────────────────────────────────────────────────────────
function buildHiFiRenderUserPrompt({
  context,
  isIosSpec,
  isHarmonySpec,
  libName,
  radiusName,
  userInputNote,
  navConstraint,
  wireframe,
  sharedComponents = {},
}) {
  const { HARMONY_SPEC_PROMPT_BLOCK } = isHarmonySpec ? require("./harmonySpec") : {};
  const wireframeInstruction = buildWireframeBodyInstruction(wireframe, sharedComponents);

  return (
    `为以下移动页面生成高保真 React 渲染代码和设计规范，以 JSON 返回：\n\n` +
    `${context}\n\n` +
    wireframeInstruction +
    (isIosSpec
      ? `【iOS 规范约束】\n` +
        `- 严格遵循 Apple HIG，视觉贴合 iPhone 原生 App\n` +
        `- 组件术语：Navigation Bar / Segmented Control / List Cell / Action Sheet\n` +
        `- 图标使用 Material Icons Round 中语义相近的图标名称\n\n`
      : "") +
    (isHarmonySpec && HARMONY_SPEC_PROMPT_BLOCK
      ? HARMONY_SPEC_PROMPT_BLOCK + "\n"
      : "") +
    `【视觉风格（最高优先级，强制执行）】\n` +
    `整体目标：${isHarmonySpec ? "华为 HarmonyOS 原生应用（花瓣健康/设置/花瓣地图）的纯净简约风格，大圆角+留白+轻投影。" : "2024-2025 年主流移动 App（微信/支付宝/小红书/健康类 App）的简约现代扁平风格。"}\n` +
    `★ 字体规范（严格执行，不得违反）：\n` +
    (isHarmonySpec
      ? `  - 页面大标题：fontSize 20px，fontWeight 700（仅顶级标题可用20px）\n` +
        `  - 卡片/区块标题：fontSize 16px，fontWeight 600\n` +
        `  - 正文/列表项内容：fontSize 14px，fontWeight 400，lineHeight 1.6\n` +
        `  - 辅助文字/备注：fontSize 12px，color 用 rgba(24,36,49,0.6)\n` +
        `  - 底部Tab标签：fontSize 10px\n` +
        `  - 禁止出现 fontSize > 20px 的文字\n` +
        `  - 禁止使用 serif/cursive 字体、textShadow\n`
      : `  - 页面标题/卡片大标题：fontSize 最大 17px，fontWeight 600\n` +
        `  - 区块小标题/Tab 标签：fontSize 14-15px，fontWeight 500-600\n` +
        `  - 正文/列表项内容：fontSize 13-14px，fontWeight 400\n` +
        `  - 辅助文字/备注/时间：fontSize 11-12px，color 用浅灰\n` +
        `  - 禁止出现 fontSize >= 20px 的文字（除非是超大数字指标如"1,200ml"）\n` +
        `  - 禁止使用 serif 字体、粗体全大写、text-shadow 等复古/夸张样式\n`) +
    (isHarmonySpec
      ? `★ 色彩规范（鸿蒙品牌色固定，极其重要）：\n` +
        `  - 鸿蒙品牌色固定为 #0A59F7，不使用 t.primary，直接写 "#0A59F7" 或从 Hm* 组件内部获取\n` +
        `  - 页面底色：#F1F3F5（不用 t.bg）；卡片背景：#fff；三级背景：rgba(0,0,0,0.05)\n` +
        `  - 主文字：rgba(0,0,0,0.9)；辅助文字：rgba(0,0,0,0.6)；占位符：rgba(0,0,0,0.4)\n` +
        `  - 警告色：#E84026；成功色：#64BB5C\n` +
        `  - 禁止大面积深色背景、禁止渐变色背景(linearGradient/radialGradient)\n`
      : `★ 色彩规范（极其重要，违反视为生成失败）：\n` +
        `  - 主色、背景色、文字色、边框色必须从 props.theme(t) 取值：t.primary / t.surface / t.bg / t.text / t.border\n` +
        `  - 唯一允许硬编码的颜色：白色(#fff/white)、透明度辅助(rgba(...,0.05~0.12))、浅灰文字(#8a9abc/#b0b8cc)\n` +
        `  - 禁止硬编码：任何 #xxx 格式的主色/深色/强调色，必须用 t.primary 代替\n` +
        `  - 背景层次：页面底色 t.bg → 卡片 t.surface → 点缀/按钮 t.primary\n` +
        `  - 禁止大面积深色背景、禁止渐变色背景(linearGradient/radialGradient)\n`) + +
    `★ 卡片/容器（统一规范，所有卡片必须一致）：\n` +
    (isHarmonySpec
      ? `  - 所有卡片/容器统一圆角：borderRadius: 16（鸿蒙特征大圆角，整个页面所有卡片必须一致）\n` +
        `  - 按钮圆角：borderRadius: 20（胶囊形，height 40px 配 radius 20px）\n` +
        `  - 输入框/搜索框：borderRadius: 24\n` +
        `  - 背景 t.surface，内边距 padding:"16px"\n` +
        `  - 阴影：boxShadow:"0 1px 6px rgba(0,0,0,0.05)"（比通用规范更轻，鸿蒙靠背景色差分层）\n` +
        `  - 卡片间距：marginBottom:12\n`
      : `  - 所有卡片/容器统一圆角：borderRadius: ${radiusName === '中圆角(8px)' ? '8' : radiusName === '大圆角(14px)' ? '14' : '8'}（整个页面所有圆角必须一致，禁止混用直角/小圆角/胶囊形）\n` +
        `  - 背景 t.surface，内边距 padding:"16px"（最小 12px，保证内容不贴边）\n` +
        `  - 阴影：boxShadow:"0 1px 8px rgba(0,0,0,0.04)"（轻盈，不要厚重阴影）\n` +
        `  - 卡片间距：marginBottom:12\n`) +
    `★ 间距与留白（极其重要，直接影响专业感）：\n` +
    (isHarmonySpec
      ? `  - 卡片内边距：padding "16px"，列表项最小高度 64px，内边距 "0 12px"\n` +
        `  - 文字行间距：lineHeight 至少 1.5\n` +
        `  - 图标与文字间距：gap 8-12px\n` +
        `  - 按钮高度：40px，内边距 "9px 16px"\n` +
        `  - 页面左右边距：padding "0 16px"\n` +
        `  - 鸿蒙强调大量留白、纯净呼吸感\n\n`
      : `  - 区块内部：padding 至少 "12px 16px"，列表项 padding 至少 "14px 0"\n` +
        `  - 文字行间距：lineHeight 至少 1.5\n` +
        `  - 图标与文字间距：gap 至少 10px\n` +
        `  - 按钮高度：至少 48px，内边距至少 "14px 24px"\n` +
        `  - 禁止内容贴边：所有区块左右至少有 16px padding\n\n`) +
    `【代码质量要求】\n` +
    `1. 每个区块函数独立实现，内容精美，与线框中该区域的功能完全匹配\n` +
    `2. 图片：使用 https://picsum.photos/seed/{语义关键词}/{宽}/{高} 真实图片\n` +
    `   • Banner：宽 800 高 220；卡片封面：宽 400 高 240；缩略图：宽 120 高 90；头像：宽 80 高 80\n` +
    `3. 图标：class="mi"，只能使用以下 Material Icons Round 标准图标名（禁止使用不在此列表中的图标名，会导致渲染为空白方块；严禁使用任何 Emoji 字符替代图标）：\n` +
    `   导航：home menu arrow_back arrow_forward arrow_forward_ios chevron_right close\n` +
    `   操作：search add add_circle_outline edit delete check done check_circle\n` +
    `   社交：favorite favorite_border thumb_up share person person_outline group\n` +
    `   通知：notifications notifications_none chat_bubble_outline email mail_outline\n` +
    `   内容：star star_border bookmark bookmark_border flag label\n` +
    `   媒体：play_arrow pause visibility visibility_off image photo_camera\n` +
    `   导引：explore filter_list sort tune more_horiz more_vert settings\n` +
    `   数据：trending_up trending_down bar_chart analytics insights show_chart\n` +
    `   时间：schedule access_time today event calendar_today history\n` +
    `   位置：location_on place near_me my_location map\n` +
    `   健康：water_drop bedtime monitor_heart fitness_center self_improvement spa\n` +
    `   工具：lock lock_open link attach_file cloud_upload download\n` +
    `   状态：info warning error help check_circle_outline cancel\n` +
    `   购物：shopping_cart local_offer payment credit_card store\n` +
    `   ⚠ 不在上方列表中的图标名请替换为列表中语义最接近的图标\n` +
    `4. 文案：从 props.uiContent 取值，禁止出现"示例/占位"\n` +
    `5. 间距系统：4/8/12/16/24px；列表左右 padding 16px\n` +
    `6. ★★ 严禁 Emoji ★★：renderCode 和 uiContent 中严禁出现任何 Emoji 字符（💧🌙🏃🌟🔥😌等）。Emoji 在不同平台渲染为 3D/拟物图标，严重破坏扁平风格一致性。所有图标必须用 Material Icons（class="mi"），文案只用纯中文/英文/数字。\n\n` +
    `【uiContent 内容生成规范（最重要）】\n` +
    `uiContent 的每个字段必须根据"页面名称"和"功能列表"推导出真实、具体的业务文案。\n` +
    `严禁使用以下内容：\n` +
    `  ✗ 页面分类名（如"主功能页面""弹窗与快捷操作""数据看板"等）——分类名绝对不能出现在任何字段中！\n` +
    `  ✗ 通用占位词（如"示例内容""列表项""标题""功能介绍"等）\n` +
    `  ✗ 技术描述词（如"区块1""Section""Banner内容"等）\n` +
    `  ✗ 任何 Emoji 字符\n` +
    `生成原则：想象自己是真实 App 的 UX 文案师，纯文字表达。\n` +
    `示例（健康类App）：\n` +
    `  功能：喝水打卡、睡眠监测、情绪记录\n` +
    `  ✓ listItems: ["今日饮水 1200ml / 目标 2000ml","睡眠 7h32min · 深睡 2h10min","情绪：平静 · 已记录"]\n` +
    `  ✗ listItems: ["💧 喝水 1200ml","主功能页面","功能项目"] ← 含 Emoji 和分类名，严禁！\n` +
    `  ✓ tabs: ["今日","本周","本月","统计"]\n` +
    `  ✗ tabs: ["主功能","弹窗","数据","设置"]\n` +
    `  ✓ navItems 必须恰好5个：如 ["首页","发现","发布","消息","我的"]\n\n` +
    `【renderCode 结构规范（严格遵守）】\n` +
    `- 纯 JavaScript + React.createElement，禁止 JSX，禁止 import/require\n` +
    `- render(props) 只返回页面主体（TopBar 和 BottomNav 由框架自动添加，绝对不要自己生成）\n` +
    `- 先定义各区块函数（Shared_xxx 或 SectionN），最后定义 render(props)\n` +
    `- 若 prompt 中提供了"已预生成公共组件"代码，必须原样写入 renderCode 开头，不得省略或修改\n` +
    `- 每个函数接收 p={t,u,ctx}，t=theme，u=uiContent\n` +
    `- render 最外层：R.createElement("div",{style:{background:t.bg}}, ...各区块)\n` +
    `- ★HTML标签规范（最常见错误，严格执行）：所有元素只使用 "div"/"span"/"button"/"img"/"input"，严禁使用 h1-h6/p/ul/ol/li/section/article/header/footer/blockquote 等语义标签！这些标签带有浏览器默认样式（粗体/边距/缩进），会严重破坏 UI 一致性。标题用 div+fontSize+fontWeight 实现，段落用 div+lineHeight 实现。\n` +
    `- ★字体自检：代码中所有 fontSize 必须 ≤ ${isHarmonySpec ? "20" : "17"}（数字指标除外），若任何 fontSize > ${isHarmonySpec ? "20" : "17"} 视为生成失败\n` +
    `- ★风格自检：禁止 fontFamily 设为 serif/cursive，禁止 textShadow，禁止 letterSpacing > 1\n` +
    (isHarmonySpec
      ? `- ★★鸿蒙组件库★★：沙箱已预注入 Hm* 系列组件（HmCard/HmButton/HmListItem 等），必须优先使用这些组件，不要自己写 borderRadius/boxShadow/padding 样式！\n`
      : "") +
    `代码示例结构：\n` +
    "```\n" +
    (isHarmonySpec
      ? "// 鸿蒙模式：使用预注入的 Hm* 组件库，品牌色已内置无需从 t 取色\n" +
        "function Section0(p){\n" +
        "  var R=React,u=p.u;\n" +
        "  return R.createElement(HmCard,{},\n" +
        "    R.createElement(HmSection,{title:u.contentTitle||'今日健康'}),\n" +
        '    R.createElement("div",{style:{display:"flex",gap:12,marginTop:12}},\n' +
        "      R.createElement(HmStatCard,{icon:'water_drop',value:u.waterVal||'1200ml',label:'饮水量'}),\n" +
        "      R.createElement(HmStatCard,{icon:'bedtime',value:u.sleepVal||'7h30m',label:'睡眠'})));\n" +
        "}\n" +
        "function Section1(p){\n" +
        "  var R=React,u=p.u,items=u.listItems||[];\n" +
        '  return R.createElement("div",{style:{padding:"0 16px"}},\n' +
        "    items.map(function(item,i){\n" +
        "      return R.createElement(HmListItem,{key:i,icon:'check_circle',title:item});\n" +
        "    }));\n" +
        "}\n" +
        "function render(props){\n" +
        '  var R=React,t={primary:"#0A59F7",surface:"#fff",bg:"#F1F3F5",text:"rgba(0,0,0,0.9)",border:"rgba(0,0,0,0.05)"},u=props.uiContent||{};\n' +
        '  return R.createElement("div",{style:{background:t.bg}},\n' +
        "    R.createElement(Section0,{t:t,u:u,ctx:props.ctx}),\n" +
        "    R.createElement(Section1,{t:t,u:u,ctx:props.ctx}));\n" +
        "}\n"
      : "// 公共区块（如搜索栏，其他页面会复用此函数原样代码）\n" +
        "function Shared_search_bar(p){\n" +
        "  var R=React,t=p.t,u=p.u;\n" +
        '  return R.createElement("div",{style:{padding:"8px 16px",background:t.surface}},\n' +
        '    R.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",\n' +
        '      background:t.bg,borderRadius:24}},\n' +
        '      R.createElement("span",{className:"mi",style:{fontSize:18,color:"#9aabcc"}},"search"),\n' +
        '      R.createElement("span",{style:{fontSize:14,color:"#9aabcc"}},u.searchPlaceholder||"搜索")));\n' +
        "}\n" +
        "// 私有区块（仅本页面使用）\n" +
        "function Section1(p){\n" +
        "  var R=React,t=p.t,u=p.u,items=u.listItems||[];\n" +
        '  return R.createElement("div",{style:{padding:"0 16px"}},\n' +
        "    items.map(function(item,i){\n" +
        '      return R.createElement("div",{key:i,style:{display:"flex",gap:12,padding:"12px 0",\n' +
        '        borderBottom:"1px solid "+t.border,alignItems:"center"}},\n' +
        '        R.createElement("img",{src:"https://picsum.photos/seed/item"+i+"/120/90",\n' +
        "          style:{width:80,height:60,borderRadius:8,flexShrink:0,objectFit:\"cover\"}}),\n" +
        '        R.createElement("div",{style:{flex:1,minWidth:0}},\n' +
        '          R.createElement("div",{style:{fontSize:14,fontWeight:600,color:t.text,\n' +
        '            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},item)));\n' +
        "    }));\n" +
        "}\n" +
        "function render(props){\n" +
        '  var R=React,t=Object.assign({primary:"#3B82F6",surface:"#fff",bg:"#f5f7fa",text:"#1a2540",border:"#e8edf5"},props.theme||{}),u=props.uiContent||{};\n' +
        '  return R.createElement("div",{style:{background:t.bg}},\n' +
        "    R.createElement(Shared_search_bar,{t:t,u:u,ctx:props.ctx}),\n" +
        "    R.createElement(Section1,{t:t,u:u,ctx:props.ctx}));\n" +
        "}\n") +
    "```\n\n" +
    `字段说明：\n` +
    `- renderInstructions：说明各区块从低保真映射到高保真的设计思路（60-120字）${userInputNote}\n` +
    `- renderCode：完整可执行代码（所有区块函数 + render 函数），必填，纯字符串不加 markdown\n` +
    `- uiContent：真实文案，所有字段必须来自功能列表的具体业务内容，严禁出现区块标签名或分类名。\n` +
    `  字段清单：pageTitle（页面真实名称）/ searchPlaceholder / tabs×4（具体维度词，如"今日/本周"）\n` +
    `  / bannerTitle / bannerSub / listItems×5（具体任务/数据条目，如"喝水 1200ml · 目标2000ml"）\n` +
    `  / cardTitles×4（具体指标或模块名，如"睡眠质量""运动步数"）\n` +
    `  / contentTitle / formFields / buttonLabel（具体操作词，如"记录饮水""完成服药"）\n` +
    `  / quickActions×4（快捷操作区专用，每项含label和icon，如[{"label":"喝水+250ml","icon":"water_drop"}]）\n` +
    `  / navItems×5\n\n` +
    `JSON 格式返回。${navConstraint}`
  );
}

module.exports = {
  HIFI_RENDER_SYSTEM_PROMPT,
  buildHiFiRenderUserPrompt,
  SHELL_SECTION_TYPES,
  toSharedFuncName,
};
