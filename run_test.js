#!/usr/bin/env node
/**
 * 仅后端时运行单个测试案例的辅助脚本
 * 用法: node run_test.js <case_dir>
 * 示例: node run_test.js new_test/1
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");

const BASE_URL = process.env.BACKEND_URL || "http://localhost:3001";

function printQuestion(question) {
  if (!question) return;
  console.log(`\nPhase ${question.phase} 问题: ${question.questionText}`);
  if (question.options?.length) {
    console.log("选项:");
    for (const option of question.options) {
      const mark = option.default ? " [default]" : "";
      const rationale = option.rationale ? ` - ${option.rationale}` : "";
      console.log(`  ${option.id}) ${option.label}${mark}${rationale}`);
    }
  }
  if (question.multiSelect) console.log("可多选：输入多个 id，用逗号分隔，例如 opt_1,opt_3");
  if (question.allowCustom) console.log("可补充自定义说明：选择后会继续询问。");
}

async function collectAnswer(question, rl, auto) {
  const options = question?.options || [];
  if (auto) {
    const defaultOptions = options.filter(o => o.default);
    const picked = defaultOptions.length ? defaultOptions : options.slice(0, 1);
    return {
      answerIds: picked.map(o => o.id),
      pickedLabels: picked.map(o => o.label),
      customText: "",
    };
  }

  printQuestion(question);

  let rawIds = "";
  if (options.length) {
    rawIds = (await rl.question("请选择选项 id（留空使用 default/第一项）：")).trim();
  }

  const defaultOptions = options.filter(o => o.default);
  const fallbackOptions = defaultOptions.length ? defaultOptions : options.slice(0, 1);
  const requestedIds = rawIds
    ? rawIds.split(/[,\s，、]+/).map(s => s.trim()).filter(Boolean)
    : fallbackOptions.map(o => o.id);

  const optionMap = new Map(options.map(o => [o.id, o]));
  const picked = requestedIds.map(id => optionMap.get(id)).filter(Boolean);
  const invalidIds = requestedIds.filter(id => !optionMap.has(id));
  if (invalidIds.length) {
    console.warn(`忽略无效选项: ${invalidIds.join(", ")}`);
  }

  const customText = question?.allowCustom
    ? (await rl.question("自定义补充（可留空）：")).trim()
    : "";

  return {
    answerIds: picked.map(o => o.id),
    pickedLabels: picked.map(o => o.label),
    customText,
  };
}

async function main() {
  const caseDir = process.argv[2];
  const auto = process.argv.includes("--auto");
  if (!caseDir) {
    console.error("用法: node run_test.js <case_dir> [--auto]");
    console.error("示例: node run_test.js new_test/1");
    console.error("自动选择第一项: node run_test.js new_test/1 --auto");
    process.exit(1);
  }

  const absDir = path.resolve(caseDir);
  const htmlPath = path.join(absDir, "html", "Index.html");
  const sourceDir = path.dirname(htmlPath);
  const briefPath = path.join(absDir, "input.txt");

  if (!fs.existsSync(htmlPath)) {
    console.error(`找不到初始 HTML: ${htmlPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(briefPath)) {
    console.error(`找不到 brief: ${briefPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  const brief = fs.readFileSync(briefPath, "utf-8").trim();

  // ── Step 1: start ──
  console.log("[1/3] 创建会话...");
  const startRes = await fetch(`${BASE_URL}/api/oneclick/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, brief, sourceDir }),
  });
  if (!startRes.ok) {
    const err = await startRes.text();
    console.error("start 失败:", startRes.status, err);
    process.exit(1);
  }
  const startData = await startRes.json();
  console.log("会话ID:", startData.sessionId);

  // ── Step 2: answer（默认交互式回答；--auto 时自动选择第一个选项）──
  let sessionId = startData.sessionId;
  let currentQuestion = startData.question;
  let done = false;
  let round = 1;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    while (!done) {
      const { answerIds, pickedLabels, customText } = await collectAnswer(currentQuestion, rl, auto);

      console.log(`[2/3] 回答第 ${round} 轮...`);
      const answerRes = await fetch(`${BASE_URL}/api/oneclick/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answerIds, pickedLabels, customText }),
      });
      if (!answerRes.ok) {
        const err = await answerRes.text();
        console.error("answer 失败:", answerRes.status, err);
        process.exit(1);
      }
      const answerData = await answerRes.json();

      if (answerData.done) {
        console.log("蓝图已生成，states 数量:", answerData.blueprint?.states?.length);
        done = true;
      } else {
        currentQuestion = answerData.question;
        round++;
        if (round > 5) {
          console.error("对话轮数过多，强制退出");
          process.exit(1);
        }
      }
    }
  } finally {
    rl.close();
  }

  // ── Step 3: generate stream ──
  console.log("[3/3] 开始流式生成...");
  const streamRes = await fetch(`${BASE_URL}/api/oneclick/generate/stream?sessionId=${sessionId}`);
  if (!streamRes.ok) {
    console.error("stream 失败:", streamRes.status, await streamRes.text());
    process.exit(1);
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done: rdDone } = await reader.read();
    if (rdDone) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split("\n");
    buf = lines.pop(); // 保留不完整行

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed.startsWith("event:")) {
        const evt = trimmed.replace("event:", "").trim();
        process.stdout.write(`[${evt}] `);
      } else if (trimmed.startsWith("data:")) {
        const data = trimmed.replace("data:", "").trim();
        try {
          const obj = JSON.parse(data);
          if (obj.stateId) process.stdout.write(`${obj.stateId} `);
          if (obj.ok != null) process.stdout.write(`ok=${obj.ok} `);
          if (obj.message) process.stdout.write(obj.message);
        } catch {
          process.stdout.write(data);
        }
        process.stdout.write("\n");
      }
    }
  }

  console.log("\n生成完成！结果在:", path.join(absDir, "_taskflow_<timestamp>/"));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
