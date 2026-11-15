/**
 * CSV → JSON catalog pipeline.
 * Source: CATALOG_CSV_URL (published Google Sheet) or data/products_clean.csv.
 */
import { spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { gzip as gzipCb } from "node:zlib";
import fs from "node:fs";
import path from "node:path";

import {
  applyGoogleSheetQuirks,
  CatalogCsvError,
  checkCsvHeaders,
  describeCsvUrl,
  fetchCatalogCsvText,
  parseCatalogCsvText,
  type CsvSourceKind,
} from "../src/lib/catalog/csv-source";
import { deriveFamily } from "../src/lib/catalog/families";
import {
  CSV_COLUMNS,
  isEmptyRow,
  normalizeRow,
  toIndexItem,
  type CsvRow,
} from "../src/lib/catalog/normalize";
import { ParseError } from "../src/lib/catalog/parse";
import {
  catalogGeneratedSchema,
  catalogIndexSchema,
  CATEGORY_SLUGS,
  type CatalogIndexItem,
  type CategorySlug,
  type Product,
} from "../src/lib/catalog/schema";
import { buildSeriesRegistry } from "../src/lib/catalog/series";
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

type Warning = { level: "warn" | "needs-review"; message: string };

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

async function loadCsvRows(): Promise<{
  rows: CsvRow[];
  source: CsvSourceKind;
  warnings: Warning[];
}> {
  const warnings: Warning[] = [];
  const url = process.env.CATALOG_CSV_URL?.trim();
  let text: string;
  let source: CsvSourceKind;

  if (url) {
    source = "remote";
    console.log(`[catalog:build] Fetching CSV from ${describeCsvUrl(url)}`);
    text = await fetchCatalogCsvText(url);
  } else {
    source = "local";
    console.log("[catalog:build] Reading", CSV_PATH);
    if (!fs.existsSync(CSV_PATH)) {
      fail(`CSV not found: ${CSV_PATH}`);
    }
    text = fs.readFileSync(CSV_PATH, "utf8");
  }

  const parsed = parseCatalogCsvText(text);
  const headerCheck = checkCsvHeaders(parsed.headers);
  if (headerCheck.unexpected.length > 0) {
    warnings.push({
      level: "warn",
      message: `Ignoring extra CSV columns: ${headerCheck.unexpected.join(", ")}`,
    });
  }
  const quirks = applyGoogleSheetQuirks(parsed.rows);
  for (const w of quirks.warnings) {
    warnings.push({ level: "warn", message: `${w.model}: ${w.message}` });
  }
  if (parsed.hasImageId) {
    warnings.push({
      level: "warn",
      message:
        "Optional column image_id present — used for photo matching and slug redirects",
    });
  }

  return { rows: quirks.rows, source, warnings };
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

function assertNotShrunk(modelCount: number, prevMeta: CatalogMeta | null): void {
  if (!prevMeta || prevMeta.modelCount <= 0) return;
  const ratio = modelCount / prevMeta.modelCount;
  if (ratio >= 0.8) return;
  if (process.env.CATALOG_ALLOW_SHRINK === "1") {
    console.warn(
      `[catalog:build] WARN: catalog shrank to ${modelCount} from ${prevMeta.modelCount} (allowed by CATALOG_ALLOW_SHRINK=1)`,
    );
    return;
  }
  fail(
    `каталог подозрительно уменьшился: ${modelCount} моделей (было ${prevMeta.modelCount}, ${(ratio * 100).toFixed(1)}% < 80%). Обход: CATALOG_ALLOW_SHRINK=1`,
  );
}

async function main(): Promise<void> {
  loadDotEnv(path.join(ROOT, ".env.local"));

  // Touch CSV_COLUMNS so the mapping stays referenced
  void CSV_COLUMNS;

  let loaded: Awaited<ReturnType<typeof loadCsvRows>>;
  try {
    loaded = await loadCsvRows();
  } catch (err) {
    if (err instanceof CatalogCsvError) fail(err.message);
    fail(err instanceof Error ? err.message : String(err));
  }

  const { rows, source } = loaded;
  const warnings: Warning[] = [...loaded.warnings];
  let discardedEmptyRows = 0;

  const dataRows: CsvRow[] = [];
  for (const row of rows) {
    if (isEmptyRow(row)) {
      discardedEmptyRows += 1;
      continue;
    }
    dataRows.push(row);
  }

  const seriesInputs = dataRows.map((row) => ({
    shortDescription: (row[CSV_COLUMNS.shortDescription] ?? "").trim(),
    fullDescription: (row[CSV_COLUMNS.fullDescription] ?? "").trim(),
  }));
  const seriesRegistry = buildSeriesRegistry(seriesInputs);

  const products: Product[] = [];
  const slugSet = new Set<string>();

  for (const row of dataRows) {
    const name = (row[CSV_COLUMNS.name] ?? "").trim();
    try {
      const seriesId = seriesRegistry.seriesIdFor(
        row[CSV_COLUMNS.shortDescription],
        row[CSV_COLUMNS.fullDescription],
      );
      const { product } = normalizeRow(row, seriesId);

      if (slugSet.has(product.slug)) {
        fail(`Duplicate slug: ${product.slug} (model ${product.name})`);
      }
      slugSet.add(product.slug);

      if (!product.imageKey) {
        warnings.push({
          level: "warn",
          message: `Missing imageKey for ${product.name}`,
        });
      }

      products.push(product);
    } catch (err) {
      if (err instanceof ParseError) {
        fail(
          `${err.field} on "${name}": ${err.message} (raw=${JSON.stringify(err.raw)})`,
        );
      }
      fail(`Row "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const prevMeta = readJsonIfExists<CatalogMeta>(OUT_META);
  assertNotShrunk(products.length, prevMeta);

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

  if (products.length !== (prevMeta?.modelCount ?? 303)) {
    warnings.push({
      level: "warn",
      message: `Model count ${products.length} (previous snapshot ${prevMeta?.modelCount ?? "none"})`,
    });
  }

  const indexProducts: CatalogIndexItem[] = products.map(toIndexItem);

  const generated = catalogGeneratedSchema.parse({
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    products,
    series: seriesRegistry.series,
  });

  const index = catalogIndexSchema.parse({
    version: 1 as const,
    products: indexProducts,
  });

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
    seriesCount: seriesRegistry.series.length,
    seriesCoverage: seriesRegistry.coverage,
    familyReport,
    warnings,
    indexBytes: Buffer.byteLength(indexJson, "utf8"),
    indexGzip,
    discardedEmptyRows,
    source,
    diff,
  });

  const cats = categoryCounts(products);
  console.log("[catalog:build] Done.");
  console.log(`  source:     ${source}`);
  console.log(`  models:     ${products.length}`);
  console.log(`  categories: ${CATEGORY_SLUGS.length}`);
  console.log(`  series:     ${seriesRegistry.series.length}`);
  console.log(
    `  families:   ${familyReport.familyCount} (${familyReport.multiVariantFamilies.length} multi-variant)`,
  );
  console.log(`  empty rows: ${discardedEmptyRows}`);
  console.log(`  redirects:  ${slugHistory.redirects.length}`);
  console.log(`  index gzip: ${indexGzip} bytes`);
  console.log("  by category:");
  for (const slug of CATEGORY_SLUGS) {
    console.log(`    ${slug}: ${cats[slug]}`);
  }
  console.log(`  wrote: ${path.relative(ROOT, OUT_GENERATED)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_INDEX)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_META)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_SLUG_HISTORY)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_REPORT)}`);

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
