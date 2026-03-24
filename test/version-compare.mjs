#!/usr/bin/env node

/**
 * Compare dembrandt extraction results between two git tags.
 *
 * Usage:
 *   node test/version-compare.mjs v0.5.0 v0.7.0
 *   node test/version-compare.mjs v0.5.0 v0.7.0 --site stripe.com
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RESULTS_DIR = path.join(__dirname, "version-results");
const REPORT_PATH = path.join(__dirname, "version-report.html");

const args = process.argv.slice(2);
const tagA = args[0];
const tagB = args[1];
const siteIdx = args.indexOf("--site");
const singleSite = siteIdx !== -1 ? args[siteIdx + 1] : null;

if (!tagA || !tagB) {
  console.log("Usage: node test/version-compare.mjs <tag-old> <tag-new> [--site domain]");
  console.log("Example: node test/version-compare.mjs v0.5.0 v0.7.0");
  process.exit(0);
}

const sites = singleSite
  ? [singleSite]
  : JSON.parse(fs.readFileSync(path.join(__dirname, "sites.json"), "utf8"));

// Save current branch to return to it
const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
const hasChanges = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
if (hasChanges) {
  execSync("git stash", { cwd: ROOT });
}

function extractWithVersion(tag, domain) {
  const dir = path.join(RESULTS_DIR, tag, domain);
  fs.mkdirSync(dir, { recursive: true });

  const screenshotPath = path.join(dir, "screenshot.png");

  try {
    // Only use --raw-colors and --screenshot if the version supports them (v0.7.1+)
    const hasNewFlags = tagCompare(tag, "v0.7.1") >= 0;
    const screenshotArg = hasNewFlags ? ` --screenshot "${screenshotPath}"` : "";
    const rawColorsArg = hasNewFlags ? " --raw-colors" : "";

    const stdout = execSync(
      `node index.js ${domain} --json-only --slow${rawColorsArg}${screenshotArg}`,
      {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 5 * 60 * 1000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) return null;

    const data = JSON.parse(stdout.slice(jsonStart));
    fs.writeFileSync(path.join(dir, "extraction.json"), JSON.stringify(data, null, 2));

    // Take screenshot manually if old version doesn't have --screenshot
    if (!hasNewFlags) {
      // Can't screenshot from old version without the flag — skip
    }

    return {
      data,
      screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : null,
    };
  } catch (err) {
    console.log(`    FAILED — ${err.message.split("\n")[0]}`);
    return null;
  }
}

function tagCompare(a, b) {
  const pa = a.replace("v", "").split(".").map(Number);
  const pb = b.replace("v", "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// Delta-E for perceptual color comparison
function deltaE(hex1, hex2) {
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  }
  function toLab(rgb) {
    let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
    g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
    b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
    x = x > 0.008856 ? x ** (1/3) : 7.787 * x + 16/116;
    y = y > 0.008856 ? y ** (1/3) : 7.787 * y + 16/116;
    z = z > 0.008856 ? z ** (1/3) : 7.787 * z + 16/116;
    return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
  }
  const rgb1 = hexToRgb(hex1), rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 999;
  const lab1 = toLab(rgb1), lab2 = toLab(rgb2);
  return Math.sqrt((lab1.L - lab2.L) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2);
}

function diffColors(paletteA, paletteB) {
  const a = (paletteA || []).map(c => c.normalized);
  const b = (paletteB || []).map(c => c.normalized);
  const aMatched = new Set(), bMatched = new Set();
  for (let i = 0; i < b.length; i++) {
    for (let j = 0; j < a.length; j++) {
      if (aMatched.has(j)) continue;
      if (deltaE(b[i], a[j]) < 15) { bMatched.add(i); aMatched.add(j); break; }
    }
  }
  return {
    added: b.filter((_, i) => !bMatched.has(i)),
    removed: a.filter((_, i) => !aMatched.has(i)),
  };
}

function generateReport(tagA, tagB, results) {
  const rows = results.map(r => {
    const diff = diffColors(r.a?.data?.colors?.palette, r.b?.data?.colors?.palette);
    const aCount = r.a?.data?.colors?.palette?.length || 0;
    const bCount = r.b?.data?.colors?.palette?.length || 0;
    const aPalette = r.a?.data?.colors?.palette || [];
    const bPalette = r.b?.data?.colors?.palette || [];
    const addedSet = new Set(diff.added);
    const delta = bCount - aCount;

    const siteImg = r.screenshotPath ? `<img src="file://${r.screenshotPath}">` : `<div class="no-img">-</div>`;

    const sw = (hex, s = 22) => `<span class="sw" style="--c:${hex};--s:${s}px" title="${hex}"></span>`;
    const swDiff = (hex, type, s = 22) => `<span class="sw ${type}" style="--c:${hex};--s:${s}px" title="${hex}"></span>`;

    const diffHtml = (diff.added.length || diff.removed.length)
      ? [...diff.added.map(c => swDiff(c, "added")), ...diff.removed.map(c => swDiff(c, "removed"))].join("")
      : '<span class="unchanged">-</span>';

    const deltaHtml = delta === 0 ? "" :
      `<span class="delta ${delta > 0 ? "up" : "down"}">${delta > 0 ? "+" : ""}${delta}</span>`;

    return `<tr class="${diff.added.length || diff.removed.length ? 'changed' : ''}">
      <td class="domain">${r.domain}</td>
      <td class="shots">${siteImg}</td>
      <td class="colors">${aPalette.map(c => sw(c.normalized)).join("")}<span class="count">${aCount}</span></td>
      <td class="colors">${bPalette.map(c => addedSet.has(c.normalized) ? swDiff(c.normalized, "added") : sw(c.normalized)).join("")}<span class="count">${bCount}</span>${deltaHtml}</td>
      <td class="diff">${diffHtml}</td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${tagA} vs ${tagB}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:#111;color:#aaa;padding:32px 24px}
h1{font-size:16px;font-weight:500;color:#eee;margin-bottom:4px}
.subtitle{font-size:13px;color:#666;margin-bottom:24px}
table{width:100%;border-collapse:collapse}
th{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#555;text-align:left;padding:8px 12px;border-bottom:1px solid #222}
td{padding:10px 12px;border-bottom:1px solid #1a1a1a;vertical-align:middle}
tr.changed{background:#1a1a1a}
.domain{font-weight:600;color:#ddd;font-size:13px;white-space:nowrap;width:120px}
.shots{width:120px}
.shots img{width:110px;height:68px;object-fit:cover;object-position:top;border-radius:3px;border:1px solid #222}
.no-img{width:110px;height:68px;background:#1a1a1a;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#333;font-size:11px}
.colors{min-width:100px}
.count{font-size:10px;color:#555;margin-left:6px}
.delta{font-size:10px;font-weight:600;margin-left:4px;padding:1px 4px;border-radius:2px}
.delta.up{color:#3fb950;background:rgba(63,185,80,0.1)}
.delta.down{color:#f85149;background:rgba(248,81,73,0.1)}
.sw{display:inline-block;width:var(--s);height:var(--s);background:var(--c);border:1px solid #333;border-radius:2px;vertical-align:middle;margin:1px}
.sw:hover{transform:scale(1.4);z-index:1;position:relative}
.sw.added{border:2px solid #3fb950}
.sw.removed{border:2px solid #f85149;opacity:.5}
.diff{min-width:60px}
.unchanged{color:#333;font-size:11px}
</style>
</head>
<body>
<h1>${tagA} vs ${tagB}</h1>
<div class="subtitle">${new Date().toISOString().slice(0, 10)} &middot; ${results.length} sites</div>
<table>
<tr><th>Site</th><th>Screenshot</th><th>${tagA}</th><th>${tagB}</th><th>Diff</th></tr>
${rows}
</table>
</body>
</html>`;
}

// Main
async function main() {
  if (fs.existsSync(RESULTS_DIR)) fs.rmSync(RESULTS_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`\nComparing ${tagA} vs ${tagB} — ${sites.length} site(s)\n`);

  // Take screenshots first (uses current Playwright, independent of version)
  console.log("  Taking screenshots...");
  const browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
  const screenshots = {};
  for (const domain of sites) {
    const screenshotDir = path.join(RESULTS_DIR, "screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${domain}.png`);
    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();
      await page.goto(`https://${domain}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: screenshotPath });
      await context.close();
      screenshots[domain] = screenshotPath;
      console.log(`    ${domain} OK`);
    } catch (err) {
      console.log(`    ${domain} FAILED`);
      screenshots[domain] = null;
    }
  }
  await browser.close();

  const results = [];

  for (const domain of sites) {
    // Extract with tag A
    console.log(`  [${tagA}] ${domain}`);
    execSync(`git checkout ${tagA} -- index.js lib/`, { cwd: ROOT, stdio: "pipe" });
    const resultA = extractWithVersion(tagA, domain);
    execSync(`git checkout ${currentBranch} -- index.js lib/`, { cwd: ROOT, stdio: "pipe" });

    // Extract with tag B
    console.log(`  [${tagB}] ${domain}`);
    execSync(`git checkout ${tagB} -- index.js lib/`, { cwd: ROOT, stdio: "pipe" });
    const resultB = extractWithVersion(tagB, domain);
    execSync(`git checkout ${currentBranch} -- index.js lib/`, { cwd: ROOT, stdio: "pipe" });

    const diffResult = diffColors(resultA?.data?.colors?.palette, resultB?.data?.colors?.palette);
    const aCount = resultA?.data?.colors?.palette?.length || 0;
    const bCount = resultB?.data?.colors?.palette?.length || 0;
    const delta = bCount - aCount;

    const status = diffResult.added.length || diffResult.removed.length
      ? `CHANGED (${delta >= 0 ? "+" : ""}${delta})`
      : "SAME";
    console.log(`    ${status}\n`);

    results.push({ domain, a: resultA, b: resultB, screenshotPath: screenshots[domain] });
  }

  // Restore working tree
  execSync(`git checkout ${currentBranch} -- index.js lib/`, { cwd: ROOT, stdio: "pipe" });
  if (hasChanges) {
    try { execSync("git stash pop", { cwd: ROOT, stdio: "pipe" }); } catch {}
  }

  // Generate report
  const html = generateReport(tagA, tagB, results);
  fs.writeFileSync(REPORT_PATH, html);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch(err => {
  // Restore on error
  try { execSync(`git checkout ${currentBranch} -- index.js lib/`, { cwd: ROOT, stdio: "pipe" }); } catch {}
  if (hasChanges) { try { execSync("git stash pop", { cwd: ROOT, stdio: "pipe" }); } catch {} }
  console.error(err);
  process.exit(1);
});
