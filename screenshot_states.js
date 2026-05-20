#!/usr/bin/env node
/**
 * 对已有的 state HTML 重新截图，对比 review.png 和最终效果
 * 用法: node screenshot_states.js <taskflow_dir>
 */
const fs = require("fs");
const path = require("path");
const { screenshotHtmlString } = require("./backend/src/integrations/htmlScreenshot");

async function main() {
  const taskflowDir = process.argv[2];
  if (!taskflowDir) {
    console.error("用法: node screenshot_states.js <taskflow_dir>");
    console.error("示例: node screenshot_states.js new_test/1/_taskflow_20260520_150118");
    process.exit(1);
  }

  const absDir = path.resolve(taskflowDir);
  const baseDir = path.dirname(absDir); // 用 sourceDir 作为 baseDir 解析相对资源

  const files = fs.readdirSync(absDir)
    .filter(f => /^state_\d+\.html$/.test(f))
    .sort();

  console.log(`找到 ${files.length} 个 state HTML，开始截图...\n`);

  for (const file of files) {
    const htmlPath = path.join(absDir, file);
    const html = fs.readFileSync(htmlPath, "utf-8");
    const stateId = file.match(/state_(\d+)/)[1];
    const outPath = path.join(absDir, `state_${stateId}_final.png`);

    process.stdout.write(`state_${stateId} ... `);
    const r = await screenshotHtmlString(html, { baseDir, waitMs: 700 });
    if (r.ok) {
      fs.writeFileSync(outPath, r.buffer);
      console.log(`✅ 截图成功 ${r.buffer.length} bytes, H=${r.height}px, ${r.ms}ms → state_${stateId}_final.png`);
    } else {
      console.log(`❌ 截图失败: ${r.reason}`);
    }
  }

  console.log("\n完成！对比文件:");
  console.log("  state_*_review.png   = Vision Review 时的快照（评审前）");
  console.log("  state_*_final.png    = 最终 HTML 渲染效果（可能含修复）");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
