#!/usr/bin/env node
/**
 * Lightweight Lighthouse CI (no extra deps): production server must already
 * be listening. Budgets match ACCEPTANCE.md / stage 10.
 *
 * Usage:
 *   PORT=3035 node scripts/lighthouse-ci.mjs
 *   LH_BASE=http://127.0.0.1:3035 node scripts/lighthouse-ci.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE =
  process.env.LH_BASE ||
  `http://127.0.0.1:${process.env.PORT || 3000}`;
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.join("docs", "qa", "stage10", "lhci");
const RUNS = Number(process.env.LH_RUNS || 3);

const BUDGETS = {
  performance: 90,
  accessibility: 95,
  "best-practices": 95,
  seo: 95,
  lcpMs: 2500,
  cls: 0.1,
};

const PATHS = [
  "/uk",
  "/uk/catalog",
  "/uk/catalog/washers",
  "/uk/catalog/washers/haier-hcw12cbd",
];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function runLighthouse(url, outFile) {
  const absOut = path.resolve(outFile);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  // One shell string: Windows npx + spaced Chrome path break argv arrays.
  const cmd = [
    "npx --yes lighthouse",
    JSON.stringify(url),
    `--chrome-path=${JSON.stringify(CHROME)}`,
    "--form-factor=mobile",
    "--screenEmulation.mobile=true",
    "--throttling-method=simulate",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json",
    `--output-path=${JSON.stringify(absOut)}`,
    "--quiet",
    `--chrome-flags=${JSON.stringify("--headless=new --no-sandbox --disable-gpu")}`,
  ].join(" ");
  const res = spawnSync(cmd, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    throw new Error(`lighthouse failed for ${url} (exit ${res.status})`);
  }
}

function scoreOf(report, id) {
  return Math.round((report.categories[id]?.score ?? 0) * 100);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const summary = [];
let failed = false;

for (const p of PATHS) {
  const runs = [];
  for (let i = 1; i <= RUNS; i += 1) {
    const safe = p.replace(/[\\/]+/g, "-").replace(/^-|-$/g, "");
    const outFile = path.join(OUT_DIR, `${safe}-run${i}.json`);
    console.log(`\n→ ${p} run ${i}/${RUNS}`);
    runLighthouse(`${BASE}${p}`, outFile);
    const report = JSON.parse(fs.readFileSync(outFile, "utf8"));
    runs.push({
      performance: scoreOf(report, "performance"),
      accessibility: scoreOf(report, "accessibility"),
      "best-practices": scoreOf(report, "best-practices"),
      seo: scoreOf(report, "seo"),
      lcpMs: report.audits["largest-contentful-paint"]?.numericValue ?? 0,
      cls: report.audits["cumulative-layout-shift"]?.numericValue ?? 0,
    });
  }

  const med = {
    path: p,
    performance: median(runs.map((r) => r.performance)),
    accessibility: median(runs.map((r) => r.accessibility)),
    "best-practices": median(runs.map((r) => r["best-practices"])),
    seo: median(runs.map((r) => r.seo)),
    lcpMs: median(runs.map((r) => r.lcpMs)),
    cls: median(runs.map((r) => r.cls)),
  };
  summary.push(med);

  const checks = [
    ["performance", med.performance >= BUDGETS.performance],
    ["accessibility", med.accessibility >= BUDGETS.accessibility],
    ["best-practices", med["best-practices"] >= BUDGETS["best-practices"]],
    ["seo", med.seo >= BUDGETS.seo],
    ["lcpMs", med.lcpMs <= BUDGETS.lcpMs],
    ["cls", med.cls <= BUDGETS.cls],
  ];
  for (const [key, ok] of checks) {
    if (!ok) {
      failed = true;
      console.error(`FAIL ${p} ${key}=${med[key]} (budget ${BUDGETS[key]})`);
    }
  }
}

const reportPath = path.join(OUT_DIR, "summary.json");
fs.writeFileSync(
  reportPath,
  JSON.stringify({ budgets: BUDGETS, base: BASE, summary }, null, 2),
);
console.log("\nMedian summary:");
console.table(
  summary.map((s) => ({
    path: s.path,
    perf: s.performance,
    a11y: s.accessibility,
    bp: s["best-practices"],
    seo: s.seo,
    lcpMs: Math.round(s.lcpMs),
    cls: Number(s.cls.toFixed(3)),
  })),
);
console.log(`Wrote ${reportPath}`);
if (failed) process.exit(1);
