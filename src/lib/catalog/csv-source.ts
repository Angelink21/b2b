/**
 * Catalog CSV loading: local file or published Google Sheets URL.
 * Network is injectable for tests. Never log the full CATALOG_CSV_URL.
 */

import { parse } from "csv-parse/sync";

import { CSV_COLUMNS, type CsvRow } from "./normalize";

export const REQUIRED_CSV_COLUMNS: readonly string[] = Object.values(CSV_COLUMNS);

/** Optional column; kept when present, not required. */
export const OPTIONAL_CSV_COLUMNS = ["image_id"] as const;

export const FETCH_TIMEOUT_MS = 20_000;
export const FETCH_RETRIES = 3;

/** Columns where Google may turn ranges like `8-9` into dates. */
export const DATE_SENSITIVE_COLUMNS: readonly string[] = [
  CSV_COLUMNS.loadKg,
  CSV_COLUMNS.workingSpeedMpm,
  CSV_COLUMNS.powerKw,
  CSV_COLUMNS.boilerPowerKw,
  CSV_COLUMNS.noiseDb,
  CSV_COLUMNS.dimensionsMm,
  CSV_COLUMNS.voltage,
];

/** Columns where a decimal comma is safe to coerce to a dot. */
export const DECIMAL_COMMA_COLUMNS: readonly string[] = [
  CSV_COLUMNS.loadKg,
  CSV_COLUMNS.volumeL,
  CSV_COLUMNS.boilerL,
  CSV_COLUMNS.powerKw,
  CSV_COLUMNS.boilerPowerKw,
  CSV_COLUMNS.gFactor,
  CSV_COLUMNS.spinRpm,
  CSV_COLUMNS.shaftDiameterMm,
  CSV_COLUMNS.workingWidthMm,
  CSV_COLUMNS.workingSpeedMpm,
  CSV_COLUMNS.dimensionsMm,
  CSV_COLUMNS.exhaustMm,
  CSV_COLUMNS.airflowM3h,
  CSV_COLUMNS.noiseDb,
];

export type CsvSourceKind = "local" | "remote";

export type FetchCatalogCsv = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export class CatalogCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogCsvError";
  }
}

/** Safe one-line description of a URL for logs (host + length only). */
export function describeCsvUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host} (${url.length} chars)`;
  } catch {
    return `(invalid URL, ${url.length} chars)`;
  }
}

/**
 * True when a cell looks like a spreadsheet date instead of a catalog value
 * (e.g. `8-9` → `8 Sept` / Excel serial).
 */
export function looksLikeSheetDate(value: string): boolean {
  const s = value.trim();
  if (!s) return false;

  // Excel / Sheets serial day numbers
  if (/^\d{5}(\.\d+)?$/.test(s)) return true;

  // `8 сент.` / `8 Sept` / `8 September 2024`
  if (
    /\d{1,2}\s*[./-]?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|янв(?:ар[яь])?|фев(?:рал[яь])?|мар(?:та?)?|апр(?:ел[яь])?|мая|май|июн[яь]?|июл[яь]?|авг(?:уста?)?|сен(?:т(?:ябр[яь])?)?|окт(?:ябр[яь])?|ноя(?:бр[яь])?|дек(?:абр[яь])?|січ(?:ня)?|лют(?:ого)?|бер(?:езня)?|квіт(?:ня)?|трав(?:ня)?|черв(?:ня)?|лип(?:ня)?|серп(?:ня)?|вер(?:есня)?|жов(?:тня)?|лис(?:топада)?|груд(?:ня)?)\.?/i.test(
      s,
    )
  ) {
    return true;
  }

  // Full numeric date with year: 8.9.2024 / 08/09/24
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(s)) return true;

  return false;
}

/** Coerce European decimal commas between digits (`2,02` → `2.02`). */
export function normalizeDecimalCommas(raw: string): {
  text: string;
  coerced: boolean;
} {
  let coerced = false;
  const text = raw.replace(/(\d),(\d)/g, (_m, a: string, b: string) => {
    coerced = true;
    return `${a}.${b}`;
  });
  return { text, coerced };
}

export type HeaderCheckResult = {
  headers: string[];
  missing: string[];
  /** Extra columns other than allowed optional ones. */
  unexpected: string[];
  hasImageId: boolean;
};

export function checkCsvHeaders(headers: string[]): HeaderCheckResult {
  const set = new Set(headers);
  const missing = REQUIRED_CSV_COLUMNS.filter((h) => !set.has(h));
  const requiredSet = new Set<string>(REQUIRED_CSV_COLUMNS);
  const optionalSet = new Set<string>(OPTIONAL_CSV_COLUMNS);
  const unexpected = headers.filter(
    (h) => !requiredSet.has(h) && !optionalSet.has(h),
  );
  return {
    headers,
    missing,
    unexpected,
    hasImageId: set.has("image_id"),
  };
}

export function formatHeaderError(check: HeaderCheckResult): string {
  const parts: string[] = [];
  if (check.missing.length > 0) {
    parts.push(`missing columns: ${check.missing.join(", ")}`);
  }
  if (check.unexpected.length > 0) {
    parts.push(
      `extra columns (ignored): ${check.unexpected.join(", ")}`,
    );
  }
  return `CSV headers do not match DATA_CONTRACT (${parts.join("; ")})`;
}

export type ParsedCatalogCsv = {
  rows: CsvRow[];
  headers: string[];
  hasImageId: boolean;
};

export function parseCatalogCsvText(text: string): ParsedCatalogCsv {
  let body = text;
  if (body.charCodeAt(0) === 0xfeff) {
    body = body.slice(1);
  }

  const records = parse(body, {
    columns: true,
    skip_empty_lines: false,
    relax_quotes: false,
    relax_column_count: true,
    trim: false,
    bom: true,
    // Google Sheets uses CRLF; csv-parse handles both.
  }) as CsvRow[];

  const headers =
    records.length > 0 ? Object.keys(records[0] as CsvRow) : ([] as string[]);

  // Empty file / header-only edge: parse may return [] with no keys.
  if (headers.length === 0 && body.trim().length > 0) {
    const firstLine = body.split(/\r?\n/)[0] ?? "";
    const headerOnly = parse(firstLine, {
      columns: false,
      relax_column_count: true,
      bom: true,
    }) as string[][];
    const cols = (headerOnly[0] ?? []).map((c) => c.trim());
    const check = checkCsvHeaders(cols);
    // Missing required columns fail; extra columns are ignored (except image_id).
    if (check.missing.length > 0) {
      throw new CatalogCsvError(formatHeaderError(check));
    }
    return { rows: [], headers: cols, hasImageId: check.hasImageId };
  }

  const check = checkCsvHeaders(headers);
  if (check.missing.length > 0) {
    throw new CatalogCsvError(formatHeaderError(check));
  }

  return { rows: records, headers, hasImageId: check.hasImageId };
}

export type SheetQuirkWarning = {
  model: string;
  column: string;
  message: string;
};

export type SheetQuirkResult = {
  rows: CsvRow[];
  warnings: SheetQuirkWarning[];
};

/**
 * Fail on date-like cells; coerce decimal commas in numeric columns.
 * Trims is left to normalizeRow; here we only fix Google export quirks.
 */
export function applyGoogleSheetQuirks(rows: CsvRow[]): SheetQuirkResult {
  const warnings: SheetQuirkWarning[] = [];
  const out: CsvRow[] = [];

  for (const row of rows) {
    const name = String(row[CSV_COLUMNS.name] ?? "").trim() || "(unknown)";
    const next: CsvRow = { ...row };

    for (const col of DATE_SENSITIVE_COLUMNS) {
      const raw = String(next[col] ?? "");
      if (looksLikeSheetDate(raw)) {
        throw new CatalogCsvError(
          `ячейка в колонке «${col}» у модели «${name}» похожа на дату (${JSON.stringify(raw)}), задай формат “Простой текст”`,
        );
      }
    }

    for (const col of DECIMAL_COMMA_COLUMNS) {
      const raw = String(next[col] ?? "");
      if (!raw) continue;
      const { text, coerced } = normalizeDecimalCommas(raw);
      if (coerced) {
        next[col] = text;
        warnings.push({
          model: name,
          column: col,
          message: `decimal comma coerced in «${col}»: ${JSON.stringify(raw)} → ${JSON.stringify(text)}`,
        });
      }
    }

    out.push(next);
  }

  return { rows: out, warnings };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Download CSV with 20s timeout and up to 3 retries.
 * `fetchImpl` defaults to global fetch (mock in tests).
 */
export async function fetchCatalogCsvText(
  url: string,
  opts?: {
    fetchImpl?: FetchCatalogCsv;
    timeoutMs?: number;
    retries?: number;
  },
): Promise<string> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? FETCH_TIMEOUT_MS;
  const retries = opts?.retries ?? FETCH_RETRIES;
  const label = describeCsvUrl(url);

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          Accept: "text/csv,text/plain,*/*",
          "User-Agent": "fagor-site-catalog-build/1.0",
        },
      });
      if (!res.ok) {
        throw new CatalogCsvError(
          `CSV download failed (${label}): HTTP ${res.status}`,
        );
      }
      const text = await res.text();
      if (!text.trim()) {
        throw new CatalogCsvError(`CSV download empty (${label})`);
      }
      return text;
    } catch (err) {
      lastError = err;
      const retryable =
        attempt < retries &&
        !(err instanceof CatalogCsvError && /HTTP 4\d\d/.test(err.message));
      if (!retryable) break;
      await sleep(250 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError instanceof CatalogCsvError) throw lastError;
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new CatalogCsvError(`CSV download failed (${label}): ${msg}`);
}
