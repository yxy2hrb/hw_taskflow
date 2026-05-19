"use strict";

// ══════════════════════════════════════════════════════════════════════════════
// HarmonyOS Design System — 基于官方 Token 色值表 + Pixso D2C 导出
// 参考：https://developer.huawei.com/consumer/cn/doc/design-guides/color-0000001776857164
// ══════════════════════════════════════════════════════════════════════════════

// ── 官方系统缺省 Token 色值（Light Mode）────────────────────────────────────
// HarmonyOS 使用 #AARRGGBB 格式；下方已转为标准 CSS rgba
const HARMONY_TOKENS = {
  colors: {
    // ── 品牌 & 语义色 ──
    brand:   "#0A59F7",                // #FF0A59F7  品牌色（宇宙蓝）
    warning: "#E84026",                // #FFE84026  一级警示色
    alert:   "#ED6F21",                // #FFED6F21  二级警示色
    confirm: "#64BB5C",                // #FF64BB5C  确认色

    // ── 文本色 ──
    fontPrimary:     "rgba(0,0,0,0.90)",   // #E5000000  一级文本
    fontSecondary:   "rgba(0,0,0,0.60)",   // #99000000  二级文本
    fontTertiary:    "rgba(0,0,0,0.40)",   // #66000000  三级文本
    fontFourth:      "rgba(0,0,0,0.20)",   // #33000000  四级文本
    fontEmphasize:   "#0A59F7",            // #FF0A59F7  高亮文本（=品牌色）
    fontOnPrimary:   "#FFFFFF",            // #FFFFFFFF  一级文本反色（品牌色上的白字）
    fontOnSecondary: "rgba(255,255,255,0.60)", // #99FFFFFF

    // ── 图标色 ──
    iconPrimary:     "rgba(0,0,0,0.90)",   // #E5000000
    iconSecondary:   "rgba(0,0,0,0.60)",   // #99000000
    iconTertiary:    "rgba(0,0,0,0.40)",   // #66000000
    iconEmphasize:   "#0A59F7",            // #FF0A59F7
    iconOnPrimary:   "#FFFFFF",            // #FFFFFFFF

    // ── 背景色 ──
    backgroundPrimary:   "#FFFFFF",        // #FFFFFFFF  一级背景（白）
    backgroundSecondary: "#F1F3F5",        // #FFF1F3F5  二级背景（页面灰底）
    backgroundTertiary:  "#E5E5EA",        // #FFE5E5EA  三级背景
    backgroundEmphasize: "#0A59F7",        // #FF0A59F7  高亮背景（=品牌色）

    // ── 控件背景色 ──
    compBackgroundPrimary:  "#FFFFFF",                // 白色背景
    compBackgroundGray:     "#F1F3F5",                // 灰色背景
    compBackgroundSecondary:"rgba(0,0,0,0.10)",       // #19000000  二级控件背景
    compBackgroundTertiary: "rgba(0,0,0,0.05)",       // #0C000000  三级控件背景
    compBackgroundEmphasize:"#0A59F7",                // 高亮控件背景（=品牌色）
    compEmphasizeSecondary: "rgba(10,89,247,0.20)",   // #330A59F7  20% 品牌色
    compEmphasizeTertiary:  "rgba(10,89,247,0.10)",   // #190A59F7  10% 品牌色

    // ── 分割线 & 交互态 ──
    compDivider:       "rgba(0,0,0,0.20)",  // #33000000
    interactiveHover:  "rgba(0,0,0,0.05)",  // #0C000000
    interactivePressed:"rgba(0,0,0,0.10)",  // #19000000
  },
  font: 'HarmonyHeiTi, "HarmonyOS Sans", -apple-system, sans-serif',
  shadow: {
    sm: "0 1px 6px rgba(0,0,0,0.05)",
    md: "0 2px 12px rgba(0,0,0,0.08)",
  },
  radius: { card: 16, button: 20, search: 24, dialog: 32, pill: 1000 },
};

// ── 鸿蒙固定主题色（覆盖用户自选主题，前后端共用）──────────────────────────
const HARMONY_FIXED_THEME = {
  primary: HARMONY_TOKENS.colors.brand,               // #0A59F7
  surface: HARMONY_TOKENS.colors.backgroundPrimary,    // #FFFFFF
  bg:      HARMONY_TOKENS.colors.backgroundSecondary,  // #F1F3F5
  text:    HARMONY_TOKENS.colors.fontPrimary,           // rgba(0,0,0,0.90)
  border:  HARMONY_TOKENS.colors.compDivider,           // rgba(0,0,0,0.20)
};

// ── HarmonyOS Symbol → Material Icons 映射表 ────────────────────────────────
// HarmonyOS Symbol 是原生图标字体（SymbolGlyph），Web 端无法直接使用。
// 本映射用于 Web 预览时将鸿蒙图标语义转为 Material Icons Round。
// 参考：https://developer.huawei.com/consumer/cn/design/harmonyos-symbol/
const HARMONY_ICON_MAP = {
  // 导航类
  "ohos_arrow_left":       "arrow_back",
  "ohos_arrow_right":      "arrow_forward",
  "ohos_chevron_right":    "chevron_right",
  "ohos_home":             "home",
  "ohos_close":            "close",
  "ohos_menu":             "menu",
  // 操作类
  "ohos_search":           "search",
  "ohos_plus":             "add",
  "ohos_trash":            "delete",
  "ohos_edit":             "edit",
  "ohos_checkmark":        "check",
  "ohos_share":            "share",
  // 人物/社交
  "ohos_person":           "person",
  "ohos_person_2":         "group",
  "ohos_heart":            "favorite",
  "ohos_heart_outline":    "favorite_border",
  "ohos_hand_thumbsup":    "thumb_up",
  // 通知/消息
  "ohos_bell":             "notifications",
  "ohos_message":          "chat_bubble_outline",
  "ohos_mail":             "email",
  // 内容
  "ohos_star":             "star",
  "ohos_star_outline":     "star_border",
  "ohos_bookmark":         "bookmark",
  "ohos_flag":             "flag",
  // 媒体
  "ohos_play":             "play_arrow",
  "ohos_pause":            "pause",
  "ohos_eye":              "visibility",
  "ohos_camera":           "photo_camera",
  "ohos_photo":            "image",
  // 设置/工具
  "gearshape":             "settings",
  "ohos_filter":           "filter_list",
  "ohos_sort":             "sort",
  "ohos_more_horizontal":  "more_horiz",
  "ohos_more_vertical":    "more_vert",
  // 数据/图表
  "ohos_chart_bar":        "bar_chart",
  "ohos_trending_up":      "trending_up",
  // 时间
  "ohos_clock":            "schedule",
  "ohos_calendar":         "calendar_today",
  "ohos_history":          "history",
  // 位置
  "ohos_location":         "location_on",
  "ohos_map":              "map",
  // 其他
  "ohos_wifi":             "wifi",
  "ohos_bluetooth":        "bluetooth",
  "ohos_folder":           "folder",
  "ohos_mic":              "mic",
  "ohos_download":         "download",
  "ohos_upload":           "upload",
  "ohos_refresh":          "refresh",
  "ohos_info":             "info",
  "ohos_warning":          "warning",
  "ohos_help":             "help",
};

// ── 注入 iframe 沙箱的鸿蒙组件库代码（基于官方 Token + D2C 精确值）────────
const HARMONY_COMPONENT_LIB_CODE = `
/* ═══ HarmonyOS Component Library (Official Token + D2C) ═══ */
(function(w){
var R=w.React;
if(!R)return;

/* 官方 Token 色值表（Light Mode） */
var T={
  brand:"#0A59F7",warning:"#E84026",alert:"#ED6F21",confirm:"#64BB5C",
  fontPri:"rgba(0,0,0,0.90)",fontSec:"rgba(0,0,0,0.60)",fontTer:"rgba(0,0,0,0.40)",fontFou:"rgba(0,0,0,0.20)",
  fontEmp:"#0A59F7",fontOnPri:"#fff",
  iconPri:"rgba(0,0,0,0.90)",iconSec:"rgba(0,0,0,0.60)",iconTer:"rgba(0,0,0,0.40)",iconEmp:"#0A59F7",iconOnPri:"#fff",
  bgPri:"#fff",bgSec:"#F1F3F5",bgTer:"#E5E5EA",bgEmp:"#0A59F7",
  compBgPri:"#fff",compBgGray:"#F1F3F5",compBgSec:"rgba(0,0,0,0.10)",compBgTer:"rgba(0,0,0,0.05)",compBgEmp:"#0A59F7",
  compEmpSec:"rgba(10,89,247,0.20)",compEmpTer:"rgba(10,89,247,0.10)",
  divider:"rgba(0,0,0,0.20)",hover:"rgba(0,0,0,0.05)",pressed:"rgba(0,0,0,0.10)",
  shadow:"0 1px 6px rgba(0,0,0,0.05)",
  font:'HarmonyHeiTi,"HarmonyOS Sans",-apple-system,sans-serif'
};
w.__HM_TOKENS=T;

w.HmIcon=function HmIcon(p){
  var sz=p.size||24,c=p.color||T.iconPri;
  return R.createElement("span",{className:"mi",style:{fontSize:sz,color:c,flexShrink:0}},p.name||"info");
};

w.HmCard=function HmCard(p){
  return R.createElement("div",{style:Object.assign({
    background:T.compBgPri,borderRadius:16,padding:16,
    boxShadow:T.shadow,marginBottom:12
  },p.style||{})},p.children);
};

w.HmButton=function HmButton(p){
  var type=p.type||"primary",full=p.full;
  var base={height:40,borderRadius:20,fontSize:16,fontWeight:400,
    fontFamily:T.font,lineHeight:"21px",
    display:"inline-flex",alignItems:"center",justifyContent:"center",
    gap:8,border:"none",cursor:"pointer",padding:"9px 16px",flexShrink:0};
  if(full){base.width="100%";}
  if(type==="primary"){base.background=T.compBgEmp;base.color=T.fontOnPri;}
  else if(type==="danger"){base.background=T.compBgTer;base.color=T.warning;}
  else if(type==="secondary"){base.background=T.compBgTer;base.color=T.fontEmp;}
  else{base.background="transparent";base.color=T.fontEmp;base.padding="9px 12px";}
  return R.createElement("button",{onClick:p.onClick||null,style:Object.assign(base,p.style||{})},
    p.icon?R.createElement("span",{className:"mi",style:{fontSize:18}},p.icon):null,
    p.label||"");
};

w.HmListItem=function HmListItem(p){
  var showDivider=p.divider!==false;
  return R.createElement("div",{onClick:p.onClick||null,style:Object.assign({
    display:"flex",alignItems:"center",gap:12,
    padding:"0 12px",minHeight:64,cursor:p.onClick?"pointer":"default",
    borderBottom:showDivider?"1px solid "+T.divider:"none"
  },p.style||{})},
    p.icon?R.createElement("span",{className:"mi",style:{fontSize:24,color:T.iconEmp,flexShrink:0}},p.icon):null,
    p.avatar?R.createElement("img",{src:p.avatar,style:{width:48,height:48,borderRadius:8,objectFit:"cover",flexShrink:0}}):null,
    R.createElement("div",{style:{flex:1,minWidth:0,padding:"10px 0"}},
      R.createElement("div",{style:{fontSize:16,fontWeight:500,fontFamily:T.font,color:T.fontPri,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},p.title||""),
      p.subtitle?R.createElement("div",{style:{fontSize:12,color:T.fontSec,marginTop:2}},p.subtitle):null),
    p.trailing?R.createElement("div",{style:{fontSize:12,color:T.fontSec,flexShrink:0}},p.trailing):null,
    p.arrow!==false?R.createElement("span",{className:"mi",style:{fontSize:20,color:T.fontTer,flexShrink:0}},"chevron_right"):null);
};

w.HmInput=function HmInput(p){
  return R.createElement("div",{style:Object.assign({
    display:"flex",alignItems:"center",gap:8,height:40,
    padding:"9px 12px",borderRadius:24,background:T.compBgTer
  },p.style||{})},
    R.createElement("span",{className:"mi",style:{fontSize:16,color:T.iconSec}},p.icon||"search"),
    R.createElement("span",{style:{fontSize:16,fontFamily:T.font,color:T.fontSec,flex:1}},p.placeholder||"搜索"));
};

w.HmProgress=function HmProgress(p){
  var pct=Math.min(100,Math.max(0,p.percent||0));
  return R.createElement("div",{style:Object.assign({height:4,borderRadius:2,background:T.compBgTer,overflow:"hidden"},p.style||{})},
    R.createElement("div",{style:{width:pct+"%",height:"100%",borderRadius:2,background:T.brand}}));
};

w.HmToggle=function HmToggle(p){
  var on=!!p.checked;
  return R.createElement("div",{onClick:p.onToggle||null,style:{
    width:44,height:24,borderRadius:12,padding:2,cursor:"pointer",flexShrink:0,
    background:on?T.brand:T.compBgTer,
    display:"flex",alignItems:"center",justifyContent:on?"flex-end":"flex-start"
  }},R.createElement("div",{style:{width:20,height:20,borderRadius:10,background:"#fff",
    boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}));
};

w.HmBadge=function HmBadge(p){
  var type=p.type||"default";
  var bg=type==="primary"?T.brand:type==="success"?T.confirm:type==="warning"?T.alert:type==="error"?T.warning:T.compBgTer;
  var color=type==="default"?T.fontPri:T.fontOnPri;
  return R.createElement("span",{style:Object.assign({
    display:"inline-flex",alignItems:"center",padding:"2px 8px",
    borderRadius:8,fontSize:12,fontWeight:500,color:color,background:bg
  },p.style||{})},p.label||"");
};

w.HmDivider=function HmDivider(p){
  return R.createElement("div",{style:Object.assign({
    height:1,background:T.divider,margin:p.indent?"0 0 0 "+(p.indent||0)+"px":"0"
  },p.style||{})});
};

w.HmSection=function HmSection(p){
  return R.createElement("div",{style:Object.assign({padding:"16px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"},p.style||{})},
    R.createElement("div",{style:{fontSize:16,fontWeight:500,fontFamily:T.font,color:T.fontPri}},p.title||""),
    p.action?R.createElement("div",{style:{fontSize:12,color:T.fontEmp,cursor:"pointer"}},p.action):null);
};

w.HmAvatar=function HmAvatar(p){
  var sz=p.size||40;
  if(p.src)return R.createElement("img",{src:p.src,style:{width:sz,height:sz,borderRadius:"50%",objectFit:"cover",flexShrink:0}});
  return R.createElement("div",{style:{width:sz,height:sz,borderRadius:"50%",background:T.brand,
    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},
    R.createElement("span",{className:"mi",style:{fontSize:sz*0.5,color:T.fontOnPri}},p.icon||"person"));
};

w.HmStatCard=function HmStatCard(p){
  return R.createElement("div",{style:Object.assign({
    background:T.compBgPri,borderRadius:16,padding:16,flex:1,minWidth:0,
    boxShadow:T.shadow
  },p.style||{})},
    p.icon?R.createElement("span",{className:"mi",style:{fontSize:20,color:T.iconEmp,marginBottom:8,display:"block"}},p.icon):null,
    R.createElement("div",{style:{fontSize:20,fontWeight:700,fontFamily:T.font,color:T.fontPri,lineHeight:1.3}},p.value||"0"),
    R.createElement("div",{style:{fontSize:12,color:T.fontSec,marginTop:4}},p.label||""));
};

w.HmDialog=function HmDialog(p){
  if(!p.visible)return null;
  return R.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}},
    R.createElement("div",{style:{width:328,background:"rgba(255,255,255,0.9)",backdropFilter:"blur(27px)",borderRadius:32,overflow:"hidden"}},
      p.title?R.createElement("div",{style:{padding:"15px 24px",borderRadius:"16px 16px 0 0"}},
        R.createElement("div",{style:{fontSize:20,fontWeight:700,fontFamily:T.font,color:T.fontPri,textAlign:"center"}},p.title)):null,
      p.body?R.createElement("div",{style:{padding:"0 24px",fontSize:16,fontFamily:T.font,color:T.fontPri,lineHeight:1.5,textAlign:"center"}},p.body):null,
      R.createElement("div",{style:{display:"flex",gap:16,padding:"16px",justifyContent:"center"}},
        p.cancelText?R.createElement("button",{onClick:p.onCancel||null,style:{flex:1,height:40,borderRadius:20,border:"none",background:T.compBgTer,color:T.fontEmp,fontSize:16,fontFamily:T.font,cursor:"pointer"}},p.cancelText):null,
        p.confirmText?R.createElement("button",{onClick:p.onConfirm||null,style:{flex:1,height:40,borderRadius:20,border:"none",background:T.compBgEmp,color:T.fontOnPri,fontSize:16,fontFamily:T.font,cursor:"pointer"}},p.confirmText):null)));
};

w.HmTabs=function HmTabs(p){
  var items=p.items||[],active=p.active||0;
  return R.createElement("div",{style:Object.assign({display:"flex",gap:1,height:64,borderRadius:20,overflow:"hidden"},p.style||{})},
    items.map(function(item,i){
      var isActive=i===active;
      var label=typeof item==="string"?item:(item.label||"");
      var icon=typeof item==="object"?item.icon:null;
      return R.createElement("div",{key:i,onClick:p.onChange?function(){p.onChange(i)}:null,style:{
        flex:1,display:"flex",flexDirection:"column",gap:4,alignItems:"center",justifyContent:"center",
        padding:"8px 12px",minHeight:40,cursor:"pointer",
        background:isActive?T.compBgEmp:T.compBgTer,
        borderRadius:i===0?"20px 0 0 20px":i===items.length-1?"0 20px 20px 0":"0"
      }},
        icon?R.createElement("span",{className:"mi",style:{fontSize:24,color:isActive?T.iconOnPri:T.iconSec}},icon):null,
        R.createElement("span",{style:{fontSize:14,fontWeight:500,fontFamily:T.font,color:isActive?T.fontOnPri:T.fontSec}},label));
    }));
};

w.HmTopBar=function HmTopBar(p){
  return R.createElement("div",{style:Object.assign({height:56,display:"flex",alignItems:"center",gap:8,padding:"4px 0",flexShrink:0},p.style||{})},
    p.back!==false?R.createElement("div",{onClick:p.onBack||null,style:{width:40,height:40,borderRadius:1000,background:T.compBgTer,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}},
      R.createElement("span",{className:"mi",style:{fontSize:24,color:T.iconPri}},"arrow_back")):null,
    R.createElement("div",{style:{flex:1,minWidth:0}},
      R.createElement("div",{style:{fontSize:20,fontWeight:700,fontFamily:T.font,color:T.fontPri}},p.title||""),
      p.subtitle?R.createElement("div",{style:{fontSize:12,color:T.fontSec}},p.subtitle):null),
    p.actions?p.actions:null);
};

})(window);
`;

// ── 精简 prompt：官方 Token 体系 + 组件 API + 图标映射 ──────────────────────
const HARMONY_LIB_PROMPT =
  `【HarmonyOS 设计规范（基于官方 Token 色值体系）】\n` +
  `参考：https://developer.huawei.com/consumer/cn/doc/design-guides/color-0000001776857164\n\n` +
  `■ 官方 Token 色值（Light Mode，已内置于 Hm* 组件）：\n` +
  `  brand=#0A59F7(品牌色)  warning=#E84026(警示)  alert=#ED6F21(提醒)  confirm=#64BB5C(确认)\n` +
  `  fontPrimary=rgba(0,0,0,0.90)  fontSecondary=rgba(0,0,0,0.60)  fontTertiary=rgba(0,0,0,0.40)\n` +
  `  fontEmphasize=#0A59F7  fontOnPrimary=#FFFFFF\n` +
  `  backgroundPrimary=#FFFFFF(卡片)  backgroundSecondary=#F1F3F5(页面灰底)\n` +
  `  compBackgroundTertiary=rgba(0,0,0,0.05)(三级控件背景)  compDivider=rgba(0,0,0,0.20)(分割线)\n\n` +
  `■ 组件库（已预注入沙箱，直接调用，禁止自行重写样式）：\n` +
  `  HmCard({style?, children})              — 白底圆角16卡片，自带阴影\n` +
  `  HmButton({label, type?, icon?, full?, onClick?, style?})  — type="primary"|"secondary"|"danger"|"text"；高40圆角20\n` +
  `  HmListItem({icon?, avatar?, title, subtitle?, trailing?, arrow?, divider?, onClick?, style?})  — 高64\n` +
  `  HmInput({icon?, placeholder?, style?})  — 搜索框（高40圆角24灰底）\n` +
  `  HmProgress({percent, style?})           — 进度条\n` +
  `  HmToggle({checked, onToggle?})          — 开关\n` +
  `  HmBadge({label, type?, style?})         — type="default"|"primary"|"success"|"warning"|"error"\n` +
  `  HmDivider({indent?, style?})            — 分割线\n` +
  `  HmSection({title, action?, style?})     — 区块标题\n` +
  `  HmAvatar({src?, icon?, size?})          — 头像\n` +
  `  HmStatCard({icon?, value, label, style?}) — 数据卡片\n` +
  `  HmIcon({name, size?, color?})           — 图标\n` +
  `  HmDialog({visible,title?,body?,cancelText?,confirmText?,onCancel?,onConfirm?}) — 弹窗圆角32\n` +
  `  HmTabs({items,active,onChange?,style?}) — 分段Tab\n` +
  `  HmTopBar({title,subtitle?,back?,onBack?,actions?,style?}) — 顶部栏高56\n\n` +
  `■ 图标规则（Web 预览使用 Material Icons，对应鸿蒙 SymbolGlyph）：\n` +
  `  鸿蒙原生使用 HarmonyOS Symbol（sys.symbol.ohos_*），Web 预览用 Material Icons Round 近似。\n` +
  `  参考映射：ohos_home→home, ohos_search→search, ohos_person→person, ohos_bell→notifications,\n` +
  `  ohos_heart→favorite, ohos_star→star, ohos_trash→delete, ohos_edit→edit, ohos_plus→add,\n` +
  `  gearshape→settings, ohos_clock→schedule, ohos_location→location_on\n` +
  `  图标库参考：https://developer.huawei.com/consumer/cn/design/harmonyos-symbol/\n\n` +
  `■ 使用规则：\n` +
  `  1. 优先使用 Hm* 组件，不要自己写 borderRadius/boxShadow/padding\n` +
  `  2. 品牌色已内置(#0A59F7)，禁止使用 t.primary 取色，可直接写 "#0A59F7"\n` +
  `  3. 布局用 div+flexbox，间距用 4/8/12/16/24 倍数\n` +
  `  4. 字体 HarmonyHeiTi，标题20px Bold，正文16px，辅助12px\n` +
  `  5. 页面底色 #F1F3F5，卡片白底 #FFFFFF\n` +
  `  6. 严禁 Emoji、serif/cursive 字体、渐变背景\n` +
  `  7. 图标只用 Material Icons Round 标准名（class="mi"），参考上方映射\n`;

const HARMONY_SPEC_PROMPT_BLOCK = HARMONY_LIB_PROMPT;

module.exports = {
  HARMONY_TOKENS,
  HARMONY_FIXED_THEME,
  HARMONY_ICON_MAP,
  HARMONY_COMPONENT_LIB_CODE,
  HARMONY_LIB_PROMPT,
  HARMONY_SPEC_PROMPT_BLOCK,
};
