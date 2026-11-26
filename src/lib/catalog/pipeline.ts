/**
 * Shared CSV → catalog parse/validate pipeline.
 * Used by `pnpm catalog:build` and runtime `getCatalog()`.
 */

import {
  applyGoogleSheetQuirks,
  CatalogCsvError,
  checkCsvHeaders,
  parseCatalogCsvText,
} from "./csv-source";
import {
  CSV_COLUMNS,
  CSV_OPTIONAL_EN_COLUMNS,
  cellOptionalEn,
  isEmptyRow,
  normalizeRow,
  toIndexItem,
  type CsvRow,
} from "./normalize";
import { ParseError } from "./parse";
import {
  catalogGeneratedSchema,
  catalogIndexSchema,
  type CatalogGenerated,
  type CatalogIndex,
  type CatalogIndexItem,
  type Product,
  type Series,
} from "./schema";
import {
  buildSeriesRegistry,
  type SeriesEnCoverage,
} from "./series";

export type CatalogPipelineWarning = {
  level: "warn" | "needs-review";
  message: string;
};

export type CatalogPipelineSuccess = {
  ok: true;
  products: Product[];
  series: Series[];
  indexProducts: CatalogIndexItem[];
  discardedEmptyRows: number;
  warnings: CatalogPipelineWarning[];
  seriesCoverage: {
    modelsWithoutFull: number;
    modelsWithoutShort: number;
    uniqueShort: number;
    uniqueFull: number;
  };
  enCoverage: SeriesEnCoverage;
};

export type CatalogPipelineFailure = {
  ok: false;
  errors: string[];
  warnings: CatalogPipelineWarning[];
};

export type CatalogPipelineResult =
  | CatalogPipelineSuccess
  | CatalogPipelineFailure;

export type CatalogPipelineMode = "build" | "runtime";

function pushError(
  mode: CatalogPipelineMode,
  errors: string[],
  message: string,
): never | void {
  if (mode === "build") {
    throw new CatalogCsvError(message);
  }
  errors.push(message);
}

/**
 * Parse CSV text into products, series, and index items.
 * Build mode throws `CatalogCsvError` / `ParseError` on fatal issues.
 * Runtime mode returns `{ ok: false, errors }` instead.
 */
export function buildCatalogFromCsvText(
  text: string,
  opts?: { mode?: CatalogPipelineMode },
): CatalogPipelineResult {
  const mode: CatalogPipelineMode = opts?.mode ?? "runtime";
  const warnings: CatalogPipelineWarning[] = [];
  const errors: string[] = [];

  let parsed: ReturnType<typeof parseCatalogCsvText>;
  try {
    parsed = parseCatalogCsvText(text);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `CSV parse failed: ${String(err)}`;
    if (mode === "build") throw err;
    return { ok: false, errors: [message], warnings };
  }

  const headerCheck = checkCsvHeaders(parsed.headers);
  if (headerCheck.unexpected.length > 0) {
    warnings.push({
      level: "warn",
      message: `Ignoring extra CSV columns: ${headerCheck.unexpected.join(", ")}`,
    });
  }

  let quirkRows: CsvRow[];
  try {
    const quirks = applyGoogleSheetQuirks(parsed.rows);
    quirkRows = quirks.rows;
    for (const w of quirks.warnings) {
      warnings.push({
        level: "warn",
        message: `${w.model}: ${w.message}`,
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `Sheet quirks failed: ${String(err)}`;
    if (mode === "build") throw err;
    return { ok: false, errors: [message], warnings };
  }

  if (parsed.hasImageId) {
    warnings.push({
      level: "warn",
      message:
        "Optional column image_id present — used for photo matching and slug redirects",
    });
  }
  if (parsed.hasShortDescriptionEn || parsed.hasFullDescriptionEn) {
    const present: string[] = [];
    if (parsed.hasShortDescriptionEn) {
      present.push(CSV_OPTIONAL_EN_COLUMNS.shortDescriptionEn);
    }
    if (parsed.hasFullDescriptionEn) {
      present.push(CSV_OPTIONAL_EN_COLUMNS.fullDescriptionEn);
    }
    warnings.push({
      level: "warn",
      message: `Optional EN description columns present: ${present.join(", ")}`,
    });
  }

  let discardedEmptyRows = 0;
  const dataRows: CsvRow[] = [];
  for (const row of quirkRows) {
    if (isEmptyRow(row)) {
      discardedEmptyRows += 1;
      continue;
    }
    dataRows.push(row);
  }

  const seriesInputs = dataRows.map((row) => ({
    shortDescription: (row[CSV_COLUMNS.shortDescription] ?? "").trim(),
    fullDescription: (row[CSV_COLUMNS.fullDescription] ?? "").trim(),
    shortDescriptionEn: cellOptionalEn(row, "shortDescriptionEn"),
    fullDescriptionEn: cellOptionalEn(row, "fullDescriptionEn"),
  }));
  const seriesRegistry = buildSeriesRegistry(seriesInputs);
  for (const w of seriesRegistry.warnings) {
    warnings.push({
      level: "warn",
      message: `${w.seriesId}: ${w.message}`,
    });
  }

  const products: Product[] = [];
  const slugSet = new Set<string>();

  for (const row of dataRows) {
    const name = (row[CSV_COLUMNS.name] ?? "").trim();
    try {
      const seriesId = seriesRegistry.seriesIdFor(
        row[CSV_COLUMNS.shortDescription],
        row[CSV_COLUMNS.fullDescription],
      );
      const normalized = normalizeRow(row, seriesId);
      const { product } = normalized;

      if (!product.slug) {
        pushError(mode, errors, `Empty slug for model "${product.name}"`);
        continue;
      }

      if (slugSet.has(product.slug)) {
        pushError(
          mode,
          errors,
          `Duplicate slug: ${product.slug} (model ${product.name})`,
        );
        continue;
      }
      slugSet.add(product.slug);

      for (const w of normalized.warnings) {
        warnings.push({
          level: "warn",
          message: `${product.name}: ${w}`,
        });
      }

      if (!product.imageKey) {
        warnings.push({
          level: "warn",
          message: `Missing imageKey for ${product.name}`,
        });
      }

      products.push(product);
    } catch (err) {
      let message: string;
      if (err instanceof ParseError) {
        message = `${err.field} on "${name}": ${err.message} (raw=${JSON.stringify(err.raw)})`;
      } else {
        message = `Row "${name}": ${err instanceof Error ? err.message : String(err)}`;
      }
      pushError(mode, errors, message);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    products,
    series: seriesRegistry.series,
    indexProducts: products.map(toIndexItem),
    discardedEmptyRows,
    warnings,
    seriesCoverage: seriesRegistry.coverage,
    enCoverage: seriesRegistry.enCoverage,
  };
}

/** Zod-validate generated + index payloads (plain objects). */
export function toCatalogPayloads(
  result: CatalogPipelineSuccess,
  generatedAt: string,
): { generated: CatalogGenerated; index: CatalogIndex } {
  const generated = catalogGeneratedSchema.parse({
    version: 1 as const,
    generatedAt,
    products: result.products,
    series: result.series,
  });
  const index = catalogIndexSchema.parse({
    version: 1 as const,
    products: result.indexProducts,
  });
  return { generated, index };
}

export type ShrinkCheckResult =
  | { ok: true }
  | { ok: false; message: string; ratio: number };

/**
 * Guard against accidental catalog wipe.
 * `allowShrink` mirrors `CATALOG_ALLOW_SHRINK=1`.
 */
export function checkCatalogShrink(
  modelCount: number,
  previousCount: number | null | undefined,
  opts?: { allowShrink?: boolean },
): ShrinkCheckResult {
  if (!previousCount || previousCount <= 0) return { ok: true };
  const ratio = modelCount / previousCount;
  if (ratio >= 0.8) return { ok: true };
  if (opts?.allowShrink) return { ok: true };
  return {
    ok: false,
    ratio,
    message: `каталог подозрительно уменьшился: ${modelCount} моделей (было ${previousCount}, ${(ratio * 100).toFixed(1)}% < 80%). Обход: CATALOG_ALLOW_SHRINK=1`,
  };
}

/** Heuristic: published-sheet auth wall or HTML error page instead of CSV. */
export function looksLikeHtmlNotCsv(text: string): boolean {
  const head = text.slice(0, 512).trimStart().toLowerCase();
  return (
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    (head.includes("<html") && head.includes("<body"))
  );
}
