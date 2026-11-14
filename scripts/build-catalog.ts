/**
 * CSV → JSON catalog pipeline.
 * Reads data/products_clean.csv, validates, writes generated JSON + report.
 */
import { promisify } from "node:util";
import { gzip as gzipCb } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

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

const gzipAsync = promisify(gzipCb);

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "data", "products_clean.csv");
const OUT_GENERATED = path.join(ROOT, "src", "data", "catalog.generated.json");
const OUT_INDEX = path.join(ROOT, "src", "data", "catalog.index.json");
const OUT_REPORT = path.join(ROOT, "docs", "CATALOG_REPORT.md");

type Warning = { level: "warn" | "needs-review"; message: string };

function fail(message: string): never {
  console.error(`[catalog:build] FAIL: ${message}`);
  process.exit(1);
}

function readCsv(): CsvRow[] {
  let text = fs.readFileSync(CSV_PATH, "utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const records = parse(text, {
    columns: true,
    skip_empty_lines: false,
    relax_quotes: false,
    relax_column_count: false,
    trim: false,
    bom: true,
  }) as CsvRow[];

  return records;
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
  console.log("[catalog:build] Reading", CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    fail(`CSV not found: ${CSV_PATH}`);
  }

  // Touch CSV_COLUMNS so tree-shaking keeps the mapping documented
  void CSV_COLUMNS;

  const rows = readCsv();
  const warnings: Warning[] = [];
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
        fail(`${err.field} on "${name}": ${err.message} (raw=${JSON.stringify(err.raw)})`);
      }
      fail(`Row "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (products.length !== 303) {
    warnings.push({
      level: "warn",
      message: `Expected 303 models, got ${products.length}`,
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

  fs.mkdirSync(path.dirname(OUT_GENERATED), { recursive: true });
  const generatedJson = `${JSON.stringify(generated, null, 2)}\n`;
  const indexJson = `${JSON.stringify(index)}\n`;
  fs.writeFileSync(OUT_GENERATED, generatedJson, "utf8");
  fs.writeFileSync(OUT_INDEX, indexJson, "utf8");

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
  });

  const cats = categoryCounts(products);
  console.log("[catalog:build] Done.");
  console.log(`  models:     ${products.length}`);
  console.log(`  categories: ${CATEGORY_SLUGS.length}`);
  console.log(`  series:     ${seriesRegistry.series.length}`);
  console.log(`  families:   ${familyReport.familyCount} (${familyReport.multiVariantFamilies.length} multi-variant)`);
  console.log(`  empty rows: ${discardedEmptyRows}`);
  console.log(`  index gzip: ${indexGzip} bytes`);
  console.log("  by category:");
  for (const slug of CATEGORY_SLUGS) {
    console.log(`    ${slug}: ${cats[slug]}`);
  }
  console.log(`  wrote: ${path.relative(ROOT, OUT_GENERATED)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_INDEX)}`);
  console.log(`  wrote: ${path.relative(ROOT, OUT_REPORT)}`);

  if (products.length !== 303) {
    fail(`Expected 303 models, got ${products.length}`);
  }
  if (indexGzip > 40 * 1024) {
    fail(`Index gzip ${indexGzip} exceeds 40 KB budget`);
  }
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
