"use strict";

const { patchOneStateViaTwoPhase } = require("./patchViaTwoPhase");

/**
 * 是否启用 twoPhase 路径。默认关闭。
 * 启用方式：HM_TWOPHASE_ENABLED=1 node backend/src/server.js
 */
function isTwoPhaseEnabled() {
  return process.env.HM_TWOPHASE_ENABLED === "1";
}

module.exports = {
  patchOneStateViaTwoPhase,
  isTwoPhaseEnabled,
};
