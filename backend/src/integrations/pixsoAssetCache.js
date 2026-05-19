"use strict";
/**
 * Pixso D2C 资源本地缓存。
 *
 * 背景：
 *   Pixso 桌面 MCP 在 D2C 输出里把图片、字体等资源都指向了
 *   http://localhost:3667/assets/<timestamp>/<filename>
 *   一旦 Pixso 桌面端关闭，这些 URL 立即 404；分享给别人或离线打开也直接坏掉。
 *
 * 解决方案：
 *   1) sync 拿到 D2C code 时，把所有 localhost:* URL 下载到本地缓存目录
 *      backend/src/specs/pixso-assets/<timestamp>/<filename>，
 *      把 code 里的 URL 就地替换为 "__HM_ASSET__/<timestamp>/<filename>" 占位符。
 *      → snapshot.json 里只保留占位符，永远脱离 Pixso 桌面端。
 *   2) 一键生成时，把整个 pixso-assets 目录复制到产物目录的 _hm-assets/，
 *      expander 把占位符替换为相对路径 "_hm-assets/<timestamp>/<filename>"。
 *      → 生成的 HTML 完全自包含，双击 file:// 即可预览。
 *
 * 缓存目录默认指向 backend/src/specs/pixso-assets/，可通过 PIXSO_ASSETS_DIR 覆盖。
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const CACHE_DIR = process.env.PIXSO_ASSETS_DIR
  ? path.resolve(process.env.PIXSO_ASSETS_DIR)
  : path.resolve(__dirname, "../specs/pixso-assets");

const PLACEHOLDER_PREFIX = "__HM_ASSET__";
// 同时匹配 http(s)://localhost:* 和已有占位符（避免重复处理）。
const URL_RE = /https?:\/\/localhost:\d+\/[^\s"'\)]+/g;

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseAssetUrl(rawUrl) {
  // http://localhost:3667/assets/1777293539187/Mask.png?xxx → { sub: "1777293539187/Mask.png" }
  let u;
  try { u = new URL(rawUrl); } catch { return null; }
  // pathname 是 /assets/1777293539187/Mask.png
  const m = u.pathname.match(/^\/assets\/([^?#]+)$/);
  if (!m) {
    // 兜底：保留原始 pathname（去掉前导 /）
    const sub = u.pathname.replace(/^\/+/, "");
    return sub ? { sub } : null;
  }
  return { sub: m[1] };
}

function downloadOnce(rawUrl, destPath) {
  return new Promise((resolve, reject) => {
    const u = new URL(rawUrl);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.get(rawUrl, { timeout: 15_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadOnce(new URL(res.headers.location, rawUrl).toString(), destPath).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${rawUrl}`));
        res.resume();
        return;
      }
      ensureDirSync(path.dirname(destPath));
      const tmp = destPath + ".part";
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on("finish", () => {
        out.close((err) => {
          if (err) return reject(err);
          fs.rename(tmp, destPath, (e2) => (e2 ? reject(e2) : resolve()));
        });
      });
      out.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`timeout: ${rawUrl}`)));
  });
}

/**
 * 把一段 D2C code 里的所有 localhost:* URL 下载到本地缓存，并把 code 里的 URL
 * 替换成占位符。已经是占位符或无 URL 时原样返回。
 *
 * @param {string} code
 * @param {object} [opts]
 * @param {(msg:string)=>void} [opts.log]
 * @returns {Promise<{ code: string, downloaded: string[], reused: string[], failed: {url:string,error:string}[] }>}
 */
async function localizeCode(code, opts = {}) {
  const log = opts.log || (() => {});
  const result = { code, downloaded: [], reused: [], failed: [] };
  if (typeof code !== "string" || !code) return result;
  const urls = [...new Set(code.match(URL_RE) || [])];
  if (!urls.length) return result;

  ensureDirSync(CACHE_DIR);
  const replacements = []; // [{ url, placeholder }]

  for (const url of urls) {
    const parsed = parseAssetUrl(url);
    if (!parsed) {
      log(`[asset] 无法解析 URL，跳过：${url}`);
      continue;
    }
    const dest = path.join(CACHE_DIR, parsed.sub);
    const placeholder = `${PLACEHOLDER_PREFIX}/${parsed.sub.replace(/\\/g, "/")}`;
    replacements.push({ url, placeholder });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      result.reused.push(parsed.sub);
      continue;
    }
    try {
      await downloadOnce(url, dest);
      result.downloaded.push(parsed.sub);
      log(`[asset] ↓ ${parsed.sub} (${fs.statSync(dest).size}b)`);
    } catch (e) {
      result.failed.push({ url, error: e.message });
      log(`[asset] ✗ ${url} → ${e.message}`);
    }
  }

  let next = code;
  for (const { url, placeholder } of replacements) {
    next = next.split(url).join(placeholder);
  }
  result.code = next;
  return result;
}

/**
 * 把缓存目录递归复制到目标目录（用于一键生成产物）。
 * 已经存在的同名文件会跳过（按 size 比较；不一致时覆盖）。
 */
async function copyCacheTo(targetDir) {
  if (!fs.existsSync(CACHE_DIR)) return { copied: 0, skipped: 0 };
  await fsp.mkdir(targetDir, { recursive: true });
  let copied = 0, skipped = 0;
  async function walk(srcDir, dstDir) {
    const entries = await fsp.readdir(srcDir, { withFileTypes: true });
    for (const ent of entries) {
      const src = path.join(srcDir, ent.name);
      const dst = path.join(dstDir, ent.name);
      if (ent.isDirectory()) {
        await fsp.mkdir(dst, { recursive: true });
        await walk(src, dst);
      } else {
        try {
          const sStat = await fsp.stat(src);
          let exists = false;
          try {
            const dStat = await fsp.stat(dst);
            if (dStat.size === sStat.size) exists = true;
          } catch {}
          if (exists) { skipped++; continue; }
          await fsp.copyFile(src, dst);
          copied++;
        } catch (e) {
          // 静默；个别文件复制失败不影响整体
        }
      }
    }
  }
  await walk(CACHE_DIR, targetDir);
  return { copied, skipped };
}

/** 把 code 中的 __HM_ASSET__/<sub> 占位符替换为 "<prefix>/<sub>" 形式的相对路径。 */
function rewritePlaceholders(code, prefix = "_hm-assets") {
  if (typeof code !== "string" || !code.includes(PLACEHOLDER_PREFIX)) return code;
  const safe = String(prefix).replace(/\/+$/, "");
  return code.split(PLACEHOLDER_PREFIX + "/").join(safe + "/");
}

module.exports = {
  CACHE_DIR,
  PLACEHOLDER_PREFIX,
  URL_RE,
  localizeCode,
  copyCacheTo,
  rewritePlaceholders,
};
