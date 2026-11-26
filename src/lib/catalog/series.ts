import { createHash } from "node:crypto";

import { normalizeDescription } from "./parse";
import type { LocaleDescription, Series } from "./schema";

export type SeriesInput = {
  shortDescription: string | undefined | null;
  fullDescription: string | undefined | null;
  shortDescriptionEn?: string | undefined | null;
  fullDescriptionEn?: string | undefined | null;
};

export type SeriesBuildWarning = {
  seriesId: string;
  message: string;
};

function seriesKey(shortText: string, fullText: string): string {
  return `${shortText}\0${fullText}`;
}

function makeSeriesId(shortText: string, fullText: string): string {
  const digest = createHash("sha1")
    .update(seriesKey(shortText, fullText))
    .digest("hex")
    .slice(0, 10);
  return `s-${digest}`;
}

function emptyLocaleDescription(): LocaleDescription {
  return { short: "", full: "", fullBullets: [], fullBlocks: [] };
}

function mostFrequentNonEmpty(
  values: readonly string[],
): { value: string; conflict: boolean } {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return { value: "", conflict: false };
  let best = "";
  let bestCount = -1;
  for (const [text, count] of counts) {
    if (count > bestCount) {
      best = text;
      bestCount = count;
    }
  }
  return { value: best, conflict: counts.size > 1 };
}

const CYRILLIC_RE = /[\u0400-\u04FF]/u;

export type EnQualityWarning = {
  seriesId: string;
  field: "short" | "full";
  message: string;
};

/** Build warnings for EN copy quality (never fails the build). */
export function collectEnDescriptionWarnings(
  series: Series,
): EnQualityWarning[] {
  const out: EnQualityWarning[] = [];
  const uk = series.descriptions.uk;
  const en = series.descriptions.en;

  for (const field of ["short", "full"] as const) {
    const enText = en[field];
    const ukText = uk[field];
    if (!enText) continue;

    if (CYRILLIC_RE.test(enText)) {
      out.push({
        seriesId: series.id,
        field,
        message: `EN ${field} contains Cyrillic`,
      });
    }
    if (ukText && enText === ukText) {
      out.push({
        seriesId: series.id,
        field,
        message: `EN ${field} equals UA ${field}`,
      });
    }
    if (ukText) {
      const ratio = enText.length / ukText.length;
      if (ratio < 0.4 || ratio > 2.5) {
        out.push({
          seriesId: series.id,
          field,
          message: `EN ${field} length ratio vs UA is ${ratio.toFixed(2)} (expected 0.4–2.5)`,
        });
      }
    }
  }

  if (en.short && en.full && en.short === en.full) {
    out.push({
      seriesId: series.id,
      field: "short",
      message: "EN short equals EN full",
    });
  }

  return out;
}

export type SeriesEnCoverage = {
  seriesWithEnShort: number;
  seriesWithEnFull: number;
  seriesWithoutEn: string[];
  modelsWithEnShort: number;
  modelsWithEnFull: number;
};

/**
 * Deduplicate short/full descriptions into Series entities.
 * Series identity = Ukrainian texts. EN taken from mode of non-empty cells.
 */
export function buildSeriesRegistry(rows: SeriesInput[]): {
  series: Series[];
  seriesIdFor: (
    shortDescription: string | undefined | null,
    fullDescription: string | undefined | null,
  ) => string;
  coverage: {
    modelsWithoutFull: number;
    modelsWithoutShort: number;
    uniqueShort: number;
    uniqueFull: number;
  };
  enCoverage: SeriesEnCoverage;
  warnings: SeriesBuildWarning[];
} {
  type Acc = {
    series: Series;
    enShortRaw: string[];
    enFullRaw: string[];
    modelCount: number;
  };

  const byKey = new Map<string, Acc>();
  let modelsWithoutFull = 0;
  let modelsWithoutShort = 0;
  let modelsWithEnShort = 0;
  let modelsWithEnFull = 0;
  const shortSet = new Set<string>();
  const fullSet = new Set<string>();
  const warnings: SeriesBuildWarning[] = [];

  for (const row of rows) {
    const shortNorm = normalizeDescription(row.shortDescription, "uk");
    const fullNorm = normalizeDescription(row.fullDescription, "uk");
    const shortText = shortNorm.text;
    const fullText = fullNorm.text;

    if (!shortText) modelsWithoutShort += 1;
    if (!fullText) modelsWithoutFull += 1;
    if (shortText) shortSet.add(shortText);
    if (fullText) fullSet.add(fullText);

    const enShortRaw = (row.shortDescriptionEn ?? "").trim();
    const enFullRaw = (row.fullDescriptionEn ?? "").trim();
    if (enShortRaw) modelsWithEnShort += 1;
    if (enFullRaw) modelsWithEnFull += 1;

    const key = seriesKey(shortText, fullText);
    let acc = byKey.get(key);
    if (!acc) {
      const uk: LocaleDescription = {
        short: shortText,
        full: fullText,
        fullBullets: fullNorm.bullets,
        fullBlocks: fullNorm.blocks,
      };
      const id = makeSeriesId(shortText, fullText);
      acc = {
        series: {
          id,
          descriptions: {
            uk,
            en: emptyLocaleDescription(),
          },
          shortDescription: shortText,
          fullDescription: fullText,
          fullBullets: fullNorm.bullets,
          fullBlocks: fullNorm.blocks,
        },
        enShortRaw: [],
        enFullRaw: [],
        modelCount: 0,
      };
      byKey.set(key, acc);
    }
    acc.modelCount += 1;
    acc.enShortRaw.push(enShortRaw);
    acc.enFullRaw.push(enFullRaw);
  }

  for (const acc of byKey.values()) {
    const shortPick = mostFrequentNonEmpty(
      acc.enShortRaw.map((r) => normalizeDescription(r, "en").text),
    );
    const fullPick = mostFrequentNonEmpty(
      acc.enFullRaw.map((r) => {
        const n = normalizeDescription(r, "en");
        return n.text;
      }),
    );

    // Prefer structured blocks from a row that contributed the winning full text.
    let enFullNorm = normalizeDescription("", "en");
    if (fullPick.value) {
      const matchRaw = acc.enFullRaw.find(
        (r) => normalizeDescription(r, "en").text === fullPick.value,
      );
      enFullNorm = normalizeDescription(matchRaw ?? fullPick.value, "en");
    }

    const enShortNorm = normalizeDescription(
      shortPick.value ? shortPick.value : "",
      "en",
    );
    // shortPick.value is already normalized text; re-normalize from raw for consistency
    const shortRawMatch = acc.enShortRaw.find(
      (r) => normalizeDescription(r, "en").text === shortPick.value,
    );
    const enShort =
      shortPick.value && shortRawMatch !== undefined
        ? normalizeDescription(shortRawMatch, "en")
        : enShortNorm;

    acc.series.descriptions.en = {
      short: shortPick.value,
      full: fullPick.value,
      fullBullets: enFullNorm.bullets,
      fullBlocks: enFullNorm.blocks,
    };

    // Ensure short uses normalized text (from raw match when possible).
    if (shortPick.value) {
      acc.series.descriptions.en.short = enShort.text || shortPick.value;
    }

    if (shortPick.conflict) {
      warnings.push({
        seriesId: acc.series.id,
        message: `Conflicting EN short descriptions within series (${acc.modelCount} models); using most frequent`,
      });
    }
    if (fullPick.conflict) {
      warnings.push({
        seriesId: acc.series.id,
        message: `Conflicting EN full descriptions within series (${acc.modelCount} models); using most frequent`,
      });
    }

    for (const w of collectEnDescriptionWarnings(acc.series)) {
      warnings.push({
        seriesId: w.seriesId,
        message: w.message,
      });
    }
  }

  const series = [...byKey.values()].map((a) => a.series);
  const seriesWithoutEn: string[] = [];
  let seriesWithEnShort = 0;
  let seriesWithEnFull = 0;
  for (const s of series) {
    const hasShort = Boolean(s.descriptions.en.short);
    const hasFull = Boolean(s.descriptions.en.full);
    if (hasShort) seriesWithEnShort += 1;
    if (hasFull) seriesWithEnFull += 1;
    if (!hasShort && !hasFull) {
      const label =
        s.descriptions.uk.short ||
        s.descriptions.uk.full.slice(0, 48) ||
        s.id;
      seriesWithoutEn.push(`${s.id}: ${label}`);
    }
  }

  return {
    series,
    seriesIdFor(shortDescription, fullDescription) {
      const shortText = normalizeDescription(shortDescription, "uk").text;
      const fullText = normalizeDescription(fullDescription, "uk").text;
      const key = seriesKey(shortText, fullText);
      const existing = byKey.get(key);
      if (!existing) {
        throw new Error(`Series not registered for key length ${key.length}`);
      }
      return existing.series.id;
    },
    coverage: {
      modelsWithoutFull,
      modelsWithoutShort,
      uniqueShort: shortSet.size,
      uniqueFull: fullSet.size,
    },
    enCoverage: {
      seriesWithEnShort,
      seriesWithEnFull,
      seriesWithoutEn,
      modelsWithEnShort,
      modelsWithEnFull,
    },
    warnings,
  };
}
