/**
 * CSV → JSON catalog pipeline.
 * Source: CATALOG_CSV_URL (published Google Sheet) or data/products_clean.csv.
 * Shared parse/validate lives in src/lib/catalog/pipeline.ts.
 */
import { spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { gzip as gzipCb } from "node:zlib";
import fs from "node:fs";
import path from "node:path";

import {
  CatalogCsvError,
  describeCsvUrl,
  fetchCatalogCsvText,
  type CsvSourceKind,
} from "../src/lib/catalog/csv-source";
import { deriveFamily } from "../src/lib/catalog/families";
import {
  buildCatalogFromCsvText,
  checkCatalogShrink,
  looksLikeHtmlNotCsv,
  toCatalogPayloads,
  type CatalogPipelineWarning,
} from "../src/lib/catalog/pipeline";
import {
  collectFeatureQualityIssues,
  formatContentQualityReport,
} from "../src/lib/catalog/present-features";
import {
  CATEGORY_SLUGS,
  type CategorySlug,
  type Product,
} from "../src/lib/catalog/schema";
import {
  diffCatalogByName,
  emptySlugHistory,
  updateSlugHistory,
  type CatalogIdentityRow,
  type SlugHistoryFile,
} from "../src/lib/catalog/slug-history";

const gzipAsync = promisify(gzipCb);

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "data", "products_clean.csv");
const OUT_GENERATED = path.join(ROOT, "src", "data", "catalog.generated.json");
const OUT_INDEX = path.join(ROOT, "src", "data", "catalog.index.json");
const OUT_META = path.join(ROOT, "src", "data", "catalog.meta.json");
const OUT_SLUG_HISTORY = path.join(ROOT, "src", "data", "slug-history.json");
const OUT_REPORT = path.join(ROOT, "docs", "CATALOG_REPORT.md");
const OUT_TRANSLATION = path.join(ROOT, "docs", "TRANSLATION_REPORT.md");
const OUT_CONTENT_QUALITY = path.join(ROOT, "docs", "CONTENT_QUALITY.md");

type Warning = CatalogPipelineWarning;

type CatalogMeta = {
  version: 1;
  modelCount: number;
  builtAt: string;
  source: CsvSourceKind;
};

function fail(message: string): never {
  console.error(`[catalog:build] FAIL: ${message}`);
  process.exit(1);
}

function loadDotEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function toIdentity(p: Product): CatalogIdentityRow {
  const row: CatalogIdentityRow = {
    slug: p.slug,
    name: p.name,
    category: p.category,
    imageKey: p.imageKey,
  };
  if (p.imageId) row.imageId = p.imageId;
  return row;
}

async function loadCsvText(): Promise<{
  text: string;
  source: CsvSourceKind;
}> {
  const url = process.env.CATALOG_CSV_URL?.trim();

  if (url) {
    console.log(`[catalog:build] Fetching CSV from ${describeCsvUrl(url)}`);
    const text = await fetchCatalogCsvText(url);
    return { text, source: "remote" };
  }

  console.log("[catalog:build] Reading", CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    fail(`CSV not found: ${CSV_PATH}`);
  }
  return { text: fs.readFileSync(CSV_PATH, "utf8"), source: "local" };
}

function emptyFieldStats(products: Product[]): Record<string, number> {
  const fields = [
    "loadKg",
    "volumeL",
    "boilerL",
    "powerKw",
    "boilerPowerKw",
    "gFactor",
    "spinRpm",
    "shaftDiameterMm",
    "workingWidthMm",
    "workingSpeedMpm",
    "heating",
    "voltage",
    "exhaustMm",
    "airflowM3h",
    "noiseDb",
  ] as const;

  const counts: Record<string, number> = {};
  for (const field of fields) {
    counts[field] = products.filter((p) => {
      const v = p[field];
      return v === null || v === undefined;
    }).length;
  }
  return counts;
}

function buildFamilyReport(products: Product[]): {
  familyCount: number;
  multiVariantFamilies: {
    familyId: string;
    base: string;
    variants: { name: string; label: string | null }[];
  }[];
} {
  const byFamily = new Map<string, Product[]>();
  for (const p of products) {
    const list = byFamily.get(p.familyId) ?? [];
    list.push(p);
    byFamily.set(p.familyId, list);
  }

  const multiVariantFamilies = [...byFamily.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([familyId, members]) => {
      const base = deriveFamily(members[0]!.name).familyBase;
      return {
        familyId,
        base,
        variants: members.map((m) => ({
          name: m.name,
          label: m.variantLabel,
        })),
      };
    })
    .sort((a, b) => a.base.localeCompare(b.base, "uk"));

  return { familyCount: byFamily.size, multiVariantFamilies };
}

function categoryCounts(products: Product[]): Record<CategorySlug, number> {
  const counts = Object.fromEntries(
    CATEGORY_SLUGS.map((c) => [c, 0]),
  ) as Record<CategorySlug, number>;
  for (const p of products) {
    counts[p.category] += 1;
  }
  return counts;
}

async function gzipSize(buf: Buffer): Promise<number> {
  const gz = await gzipAsync(buf);
  return gz.byteLength;
}

function writeReport(opts: {
  products: Product[];
  seriesCount: number;
  seriesCoverage: {
    modelsWithoutFull: number;
    modelsWithoutShort: number;
    uniqueShort: number;
    uniqueFull: number;
  };
  familyReport: ReturnType<typeof buildFamilyReport>;
  warnings: Warning[];
  indexBytes: number;
  indexGzip: number;
  discardedEmptyRows: number;
  source: CsvSourceKind;
  diff: ReturnType<typeof diffCatalogByName> | null;
}): void {
  const cats = categoryCounts(opts.products);
  const empty = emptyFieldStats(opts.products);
  const finishingNoHeat = opts.products.filter(
    (p) => p.category === "finishing" && p.heating === null,
  );

  const lines: string[] = [];
  lines.push("# Catalog build report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: **${opts.source}**`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Models: **${opts.products.length}**`);
  lines.push(`- Categories: **${CATEGORY_SLUGS.length}**`);
  lines.push(`- Series entities: **${opts.seriesCount}**`);
  lines.push(`- Families: **${opts.familyReport.familyCount}**`);
  lines.push(
    `- Multi-variant families: **${opts.familyReport.multiVariantFamilies.length}**`,
  );
  lines.push(`- Discarded empty CSV rows: **${opts.discardedEmptyRows}**`);
  lines.push(
    `- Index JSON: ${opts.indexBytes} bytes raw, **${opts.indexGzip}** bytes gzip`,
  );
  lines.push("");

  lines.push("## Что изменилось с прошлой сборки");
  lines.push("");
  if (!opts.diff) {
    lines.push("_Нет предыдущего снимка — первая сборка или meta отсутствует._");
  } else {
    const { added, removed, changed, renamed } = opts.diff;
    lines.push(`- Добавлены (${added.length}): ${added.length ? added.join(", ") : "—"}`);
    lines.push(`- Удалены (${removed.length}): ${removed.length ? removed.join(", ") : "—"}`);
    lines.push(
      `- Изменены по имени (${changed.length}): ${changed.length ? changed.join(", ") : "—"}`,
    );
    if (renamed.length > 0) {
      lines.push("- Переименования (по imageKey / image_id):");
      for (const r of renamed) {
        lines.push(`  - ${r.from} → ${r.to}`);
      }
    } else {
      lines.push("- Переименования (по imageKey / image_id): —");
    }
  }
  lines.push("");

  lines.push("## Counts by category");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("|---|---|");
  for (const slug of CATEGORY_SLUGS) {
    lines.push(`| \`${slug}\` | ${cats[slug]} |`);
  }
  lines.push("");
  lines.push("## Empty fields (null count)");
  lines.push("");
  lines.push("| Field | Empty |");
  lines.push("|---|---|");
  for (const [field, count] of Object.entries(empty)) {
    lines.push(`| \`${field}\` | ${count} |`);
  }
  lines.push("");
  lines.push("## Series coverage");
  lines.push("");
  lines.push(
    `- Unique short descriptions: ${opts.seriesCoverage.uniqueShort}`,
  );
  lines.push(`- Unique full descriptions: ${opts.seriesCoverage.uniqueFull}`);
  lines.push(
    `- Models without short description: ${opts.seriesCoverage.modelsWithoutShort}`,
  );
  lines.push(
    `- Models without full description: ${opts.seriesCoverage.modelsWithoutFull}`,
  );
  lines.push("");
  lines.push("## Needs-review");
  lines.push("");
  for (const w of opts.warnings.filter((x) => x.level === "needs-review")) {
    lines.push(`- ${w.message}`);
  }
  if (finishingNoHeat.length > 0) {
    lines.push(
      `- Finishing without heating (${finishingNoHeat.length}): ${finishingNoHeat.map((p) => p.name).join(", ")}`,
    );
  }
  lines.push(
    "- EN category labels from prototype — confirm with customer (DATA_CONTRACT Q3)",
  );
  lines.push(
    "- Family/variant suffix heuristic — labels only, meaning unknown (Q2)",
  );
  lines.push(
    "- loadKg ranges stored as raw+min/max; meaning not interpreted (Q1)",
  );
  lines.push("");
  lines.push("## Warnings");
  lines.push("");
  const warns = opts.warnings.filter((x) => x.level === "warn");
  if (warns.length === 0) {
    lines.push("_None_");
  } else {
    for (const w of warns) {
      lines.push(`- ${w.message}`);
    }
  }
  lines.push("");
  lines.push("## Multi-variant families (for review)");
  lines.push("");
  lines.push(
    `Total: ${opts.familyReport.multiVariantFamilies.length} families.`,
  );
  lines.push("");
  for (const fam of opts.familyReport.multiVariantFamilies) {
    lines.push(`### \`${fam.base}\` (\`${fam.familyId}\`)`);
    lines.push("");
    for (const v of fam.variants) {
      lines.push(`- ${v.name}${v.label ? ` → \`${v.label}\`` : ""}`);
    }
    lines.push("");
  }

  fs.writeFileSync(OUT_REPORT, `${lines.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  loadDotEnv(path.join(ROOT, ".env.local"));

  let text: string;
  let source: CsvSourceKind;
  try {
    ({ text, source } = await loadCsvText());
  } catch (err) {
    if (err instanceof CatalogCsvError) fail(err.message);
    fail(err instanceof Error ? err.message : String(err));
  }

  if (looksLikeHtmlNotCsv(text)) {
    fail("CSV source returned HTML instead of CSV (check publish access)");
  }

  let pipeline;
  try {
    pipeline = buildCatalogFromCsvText(text, { mode: "build" });
  } catch (err) {
    if (err instanceof CatalogCsvError) fail(err.message);
    if (err instanceof Error) fail(err.message);
    fail(String(err));
  }

  if (!pipeline.ok) {
    fail(pipeline.errors.join("; "));
  }

  const {
    products,
    series,
    discardedEmptyRows,
    warnings,
    seriesCoverage,
    enCoverage,
  } = pipeline;

  const prevMeta = readJsonIfExists<CatalogMeta>(OUT_META);
  const shrink = checkCatalogShrink(products.length, prevMeta?.modelCount);
  if (!shrink.ok) {
    if (process.env.CATALOG_ALLOW_SHRINK === "1") {
      console.warn(
        `[catalog:build] WARN: catalog shrank to ${products.length} from ${prevMeta?.modelCount} (allowed by CATALOG_ALLOW_SHRINK=1)`,
      );
    } else {
      fail(shrink.message);
    }
  }

  const prevGenerated = readJsonIfExists<{ products: Product[] }>(OUT_GENERATED);
  const prevIdentities = (prevGenerated?.products ?? []).map(toIdentity);
  const nextIdentities = products.map(toIdentity);
  const diff =
    prevIdentities.length > 0
      ? diffCatalogByName(prevIdentities, nextIdentities)
      : null;

  const prevHistory =
    readJsonIfExists<SlugHistoryFile>(OUT_SLUG_HISTORY) ?? emptySlugHistory();
  const slugHistory = updateSlugHistory(
    prevHistory,
    prevIdentities,
    nextIdentities,
  );

  const buildWarnings: Warning[] = [...warnings];
  if (products.length !== (prevMeta?.modelCount ?? 303)) {
    buildWarnings.push({
      level: "warn",
      message: `Model count ${products.length} (previous snapshot ${prevMeta?.modelCount ?? "none"})`,
    });
  }

  const generatedAt = new Date().toISOString();
  const { generated, index } = toCatalogPayloads(pipeline, generatedAt);

  const meta: CatalogMeta = {
    version: 1,
    modelCount: products.length,
    builtAt: generated.generatedAt,
    source,
  };

  fs.mkdirSync(path.dirname(OUT_GENERATED), { recursive: true });
  const generatedJson = `${JSON.stringify(generated, null, 2)}\n`;
  const indexJson = `${JSON.stringify(index)}\n`;
  fs.writeFileSync(OUT_GENERATED, generatedJson, "utf8");
  fs.writeFileSync(OUT_INDEX, indexJson, "utf8");
  fs.writeFileSync(OUT_META, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    OUT_SLUG_HISTORY,
    `${JSON.stringify(slugHistory, null, 2)}\n`,
    "utf8",
  );

  const indexGzip = await gzipSize(Buffer.from(indexJson, "utf8"));
  const familyReport = buildFamilyReport(products);

  writeReport({
    products,
    seriesCount: series.length,
    seriesCoverage,
    familyReport,
    warnings: buildWarnings,
    indexBytes: Buffer.byteLength(indexJson, "utf8"),
    indexGzip,
    discardedEmptyRows,
    source,
    diff,
  });

  const enWarns = buildWarnings.filter(
    (w) =>
      /EN |Conflicting EN|Cyrillic|equals UA|length ratio|short equals EN full/i.test(
        w.message,
      ),
  );
  const translationLines: string[] = [
    "# Translation report (EN descriptions)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: **${source}**`,
    "",
    "## Coverage",
    "",
    `- Series with EN short: **${enCoverage.seriesWithEnShort}** / ${series.length}`,
    `- Series with EN full: **${enCoverage.seriesWithEnFull}** / ${series.length}`,
    `- Models with EN short cell: **${enCoverage.modelsWithEnShort}** / ${products.length}`,
    `- Models with EN full cell: **${enCoverage.modelsWithEnFull}** / ${products.length}`,
    "",
    "## Series without EN",
    "",
  ];
  if (enCoverage.seriesWithoutEn.length === 0) {
    translationLines.push("_All series have at least one EN field._");
  } else {
    for (const line of enCoverage.seriesWithoutEn) {
      translationLines.push(`- ${line}`);
    }
  }
  translationLines.push("", "## Warnings", "");
  if (enWarns.length === 0) {
    translationLines.push("_None._");
  } else {
    for (const w of enWarns) {
      translationLines.push(`- ${w.message}`);
    }
  }
  translationLines.push("");
  fs.writeFileSync(OUT_TRANSLATION, `${translationLines.join("\n")}\n`, "utf8");

  const qualityIssues = collectFeatureQualityIssues(
    series.map((s) => ({
      id: s.id,
      label: s.descriptions.uk.short || s.shortDescription || s.id,
      items:
        s.descriptions.uk.fullBlocks && s.descriptions.uk.fullBlocks.length > 0
          ? s.descriptions.uk.fullBlocks
              .filter((b) => b.kind === "bullet")
              .map((b) => b.text)
          : s.descriptions.uk.fullBullets.length > 0
            ? s.descriptions.uk.fullBullets
            : s.fullBullets,
    })),
  );
  fs.writeFileSync(
    OUT_CONTENT_QUALITY,
    formatContentQualityReport(qualityIssues, new Date().toISOString()),
    "utf8",
  );

  const cats = categoryCounts(products);
  console.log("[catalog:build] Done.");
  console.log(`  source:     ${source}`);
  console.log(`  models:     ${products.length}`);
  console.log(`  categories: ${CATEGORY_SLUGS.length}`);
  console.log(`  series:     ${series.length}`);
  console.log(
    `  families:   ${familyReport.familyCount} (${familyReport.multiVariantFamilies.length} multi-variant)`,
  );
  console.log(`  empty rows: ${discardedEmptyRows}`);
  console.log(`  redirects:  ${slugHistory.redirects.length}`);
  console.log(`  index gzip: ${indexGzip} bytes`);
  console.log(
    `  EN series:  short ${enCoverage.seriesWithEnShort}/${series.length}, full ${enCoverage.seriesWithEnFull}/${series.length}`,
  );
  console.log(
    `  EN models:  short ${enCoverage.modelsWithEnShort}, full ${enCoverage.modelsWithEnFull}`,
  );
  console.log(
    `  EN missing: ${enCoverage.seriesWithoutEn.length} series without EN`,
  );
  if (enWarns.length > 0) {
    console.log(`  EN warns:   ${enWarns.length}`);
    for (const w of enWarns.slice(0, 12)) {
      console.log(`    - ${w.message}`);
    }
    if (enWarns.length > 12) {
      console.log(`    … +${enWarns.length - 12} more (see TRANSLATION_REPORT)`);
    }
  }
  console.log("  by category:");
  for (const slug of CATEGORY_SLUGS) {
    console.log(`    ${slug}: ${cats[slug]}`);
  }
  console.log(`  wrote: ${path.relative(ROOT, OUT_GENERATED)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_INDEX)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_META)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_SLUG_HISTORY)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_REPORT)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_TRANSLATION)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_CONTENT_QUALITY)}`);
  console.log(`  content quality issues: ${qualityIssues.length}`);

  if (indexGzip > 40 * 1024) {
    fail(`Index gzip ${indexGzip} exceeds 40 KB budget`);
  }

  {
    // images:sync loads .env.local itself; no-ops without CLOUDINARY_CLOUD_NAME.
    console.log("[catalog:build] Running images:sync…");
    const tsxCli = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
    const syncScript = path.join(ROOT, "scripts", "sync-images.ts");
    const sync = spawnSync(process.execPath, [tsxCli, syncScript], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    if (sync.error) {
      fail(`images:sync failed to start: ${sync.error.message}`);
    }
    if (sync.status !== 0) {
      fail(`images:sync failed (exit ${sync.status ?? "null"})`);
    }
  }
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
