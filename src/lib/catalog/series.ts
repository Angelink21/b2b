import { createHash } from "node:crypto";

import { normalizeDescription } from "./parse";
import type { Series } from "./schema";

export type SeriesInput = {
  shortDescription: string | undefined | null;
  fullDescription: string | undefined | null;
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

/**
 * Deduplicate short/full descriptions into Series entities.
 * Models reference series by id; empty descriptions still get a series entry.
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
} {
  const byKey = new Map<string, Series>();
  let modelsWithoutFull = 0;
  let modelsWithoutShort = 0;
  const shortSet = new Set<string>();
  const fullSet = new Set<string>();

  for (const row of rows) {
    const shortNorm = normalizeDescription(row.shortDescription);
    const fullNorm = normalizeDescription(row.fullDescription);
    const shortText = shortNorm.text;
    const fullText = fullNorm.text;

    if (!shortText) modelsWithoutShort += 1;
    if (!fullText) modelsWithoutFull += 1;
    if (shortText) shortSet.add(shortText);
    if (fullText) fullSet.add(fullText);

    const key = seriesKey(shortText, fullText);
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: makeSeriesId(shortText, fullText),
        shortDescription: shortText,
        fullDescription: fullText,
        fullBullets: fullNorm.bullets,
      });
    }
  }

  return {
    series: [...byKey.values()],
    seriesIdFor(shortDescription, fullDescription) {
      const shortText = normalizeDescription(shortDescription).text;
      const fullText = normalizeDescription(fullDescription).text;
      const key = seriesKey(shortText, fullText);
      const existing = byKey.get(key);
      if (!existing) {
        throw new Error(`Series not registered for key length ${key.length}`);
      }
      return existing.id;
    },
    coverage: {
      modelsWithoutFull,
      modelsWithoutShort,
      uniqueShort: shortSet.size,
      uniqueFull: fullSet.size,
    },
  };
}
