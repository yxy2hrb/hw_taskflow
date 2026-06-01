#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = requireFromCwd("playwright");
const { PNG } = requireFromCwd("pngjs");
const { ssim } = requireFromCwd("ssim.js");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function printHelp() {
  console.log(`
Capture a Storybook story screenshot and compare it with Pixso truth image via SSIM.

Usage:
  node skills/pixso-to-shadcn-react/scripts/capture_storybook.js \\
    --story-id button--primary \\
    --pixso-image /absolute/path/pixso.png

Options:
  --storybook-url  Storybook host (default: http://127.0.0.1:6006)
  --story-id       Story id in iframe (required)
  --pixso-image    Local PNG from get_image export (required)
  --out-dir        Output directory (default: .artifacts/visual-regression)
  --threshold      Allowed diff ratio [0..1] (default: 0.05)
  --wait-ms        Extra wait after page load (default: 800)
  --selector       Capture element selector (default: #storybook-root)
  --full-page      Capture full page instead of selector
  --help           Show help

Exit code:
  0 when diff <= threshold, 1 otherwise.
`);
}

function readPng(filePath) {
  return fs.readFile(filePath).then((buffer) => PNG.sync.read(buffer));
}

function cropTopLeft(png, width, height) {
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, width, height, 0, 0);
  return out;
}

function ensureFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    printHelp();
    return;
  }

  const storyId = args["story-id"];
  const pixsoImage = args["pixso-image"];
  if (!storyId || !pixsoImage) {
    printHelp();
    throw new Error("Missing required args: --story-id and --pixso-image");
  }

  const storybookUrl = args["storybook-url"] ?? "http://127.0.0.1:6006";
  const outDir = path.resolve(args["out-dir"] ?? ".artifacts/visual-regression");
  const threshold = ensureFiniteNumber(args.threshold, 0.05);
  const waitMs = ensureFiniteNumber(args["wait-ms"], 800);
  const selector = args.selector ?? "#storybook-root";
  const fullPage = args["full-page"] === "true";

  await fs.mkdir(outDir, { recursive: true });

  const safeId = storyId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storyShotPath = path.join(outDir, `${safeId}.storybook.png`);
  const diffMetaPath = path.join(outDir, `${safeId}.ssim.json`);
  const iframeUrl = `${storybookUrl.replace(/\/$/, "")}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(iframeUrl, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(waitMs);

    if (fullPage) {
      await page.screenshot({ path: storyShotPath, fullPage: true });
    } else {
      const node = page.locator(selector).first();
      if ((await node.count()) === 0) {
        throw new Error(`Selector not found: ${selector}. Pass --full-page true or adjust --selector.`);
      }
      await node.screenshot({ path: storyShotPath });
    }
  } finally {
    await browser.close();
  }

  const pixsoPng = await readPng(path.resolve(pixsoImage));
  const storyPng = await readPng(storyShotPath);

  const width = Math.min(pixsoPng.width, storyPng.width);
  const height = Math.min(pixsoPng.height, storyPng.height);
  if (width < 8 || height < 8) {
    throw new Error(
      `Image too small for SSIM comparison. pixso=${pixsoPng.width}x${pixsoPng.height}, story=${storyPng.width}x${storyPng.height}`
    );
  }

  const pixsoCrop = cropTopLeft(pixsoPng, width, height);
  const storyCrop = cropTopLeft(storyPng, width, height);

  const { mssim } = ssim(
    { data: pixsoCrop.data, width, height },
    { data: storyCrop.data, width, height }
  );
  const diffRatio = 1 - mssim;
  const pass = diffRatio <= threshold;

  const report = {
    storyId,
    iframeUrl,
    pixsoImage: path.resolve(pixsoImage),
    storyShotPath,
    comparedSize: { width, height },
    originalSize: {
      pixso: { width: pixsoPng.width, height: pixsoPng.height },
      story: { width: storyPng.width, height: storyPng.height },
    },
    ssim: mssim,
    diffRatio,
    diffPercent: Number((diffRatio * 100).toFixed(4)),
    thresholdRatio: threshold,
    thresholdPercent: Number((threshold * 100).toFixed(4)),
    pass,
  };

  await fs.writeFile(diffMetaPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`[visual-compare] story=${storyId}`);
  console.log(
    `[visual-compare] SSIM=${mssim.toFixed(6)} diff=${(diffRatio * 100).toFixed(4)}% threshold=${(threshold * 100).toFixed(2)}%`
  );
  console.log(`[visual-compare] report=${diffMetaPath}`);

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("Cannot find module") ||
    message.includes("Cannot find package")
  ) {
    console.error(
      "[visual-compare] Missing dependency in current project. Install: npm i -D playwright pngjs ssim.js"
    );
  }
  if (message.includes("Executable doesn't exist")) {
    console.error(
      "[visual-compare] Playwright browser not installed. Run: npx playwright install chromium"
    );
  }
  console.error(`[visual-compare] ${message}`);
  process.exit(1);
});
