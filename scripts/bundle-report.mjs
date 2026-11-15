#!/usr/bin/env node
/** Summarize `.next/static/chunks` gzip sizes after `pnpm build`. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dir = path.join(".next", "static", "chunks");
if (!fs.existsSync(dir)) {
  console.error("Missing .next/static/chunks — run pnpm build first");
  process.exit(1);
}

const rows = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => {
    const buf = fs.readFileSync(path.join(dir, f));
    const gz = zlib.gzipSync(buf, { level: 9 });
    const text = buf.toString("utf8");
    const hints = [
      "createHmac",
      "motion",
      "nuqs",
      "react-dom",
      "next-intl",
      "zod",
      "CatalogExplorer",
    ].filter((h) => text.includes(h));
    return {
      file: f,
      rawKB: +(buf.length / 1024).toFixed(1),
      gzKB: +(gz.length / 1024).toFixed(1),
      hints: hints.join(",") || "—",
    };
  })
  .sort((a, b) => b.gzKB - a.gzKB);

const outDir = path.join("docs", "qa", "stage10");
fs.mkdirSync(outDir, { recursive: true });
const top = rows.slice(0, 15);
const report = {
  generatedAt: new Date().toISOString(),
  topChunks: top,
  totalJsGzKB: +rows.reduce((s, r) => s + r.gzKB, 0).toFixed(1),
};
fs.writeFileSync(
  path.join(outDir, "bundle-report.json"),
  JSON.stringify(report, null, 2),
);
console.table(top);
console.log(`Total JS gzip (all chunks): ${report.totalJsGzKB} KB`);
if (rows.some((r) => r.hints.includes("createHmac"))) {
  console.error("WARN: createHmac still present in a client chunk");
  process.exit(2);
}
