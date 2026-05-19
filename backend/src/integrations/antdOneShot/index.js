/**
 * ============================================================
 *  antdOneShot · 模块入口
 *
 *  Feature flag: HM_ANTD_ENABLED=1 启用
 *
 *  对外暴露：
 *    isAntdOneShotEnabled()        feature flag 是否打开
 *    runAntdOneShotPipeline(...)   主 pipeline（参见 ./pipeline.js）
 * ============================================================
 */

const { runAntdOneShotPipeline } = require("./pipeline");

function isAntdOneShotEnabled() {
  return process.env.HM_ANTD_ENABLED === "1";
}

module.exports = {
  isAntdOneShotEnabled,
  runAntdOneShotPipeline,
};
