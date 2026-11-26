import type { DescriptionBlock, LocaleDescription, Series } from "./schema";

export type SeriesCopyLocale = "uk" | "en";

export type ResolvedSeriesCopy = {
  short: string;
  full: string;
  fullBullets: string[];
  fullBlocks: DescriptionBlock[];
  /** True when locale is en but only Ukrainian text is available. */
  isFallbackUk: boolean;
  /** BCP 47 lang for the description body. */
  lang: "uk" | "en";
};

function emptyLocale(): LocaleDescription {
  return { short: "", full: "", fullBullets: [], fullBlocks: [] };
}

function localeFromSeries(
  series: Series,
  locale: SeriesCopyLocale,
): LocaleDescription {
  if (series.descriptions?.[locale]) {
    return series.descriptions[locale];
  }
  // Legacy flat fields = Ukrainian only
  if (locale === "uk") {
    return {
      short: series.shortDescription ?? "",
      full: series.fullDescription ?? "",
      fullBullets: series.fullBullets ?? [],
      fullBlocks: series.fullBlocks ?? [],
    };
  }
  return emptyLocale();
}

function hasText(desc: LocaleDescription): boolean {
  return Boolean(
    desc.short.trim() ||
      desc.full.trim() ||
      desc.fullBullets.length > 0 ||
      (desc.fullBlocks && desc.fullBlocks.length > 0),
  );
}

/**
 * Localized series copy for UI. On /en falls back to Ukrainian with a note
 * when EN cells are empty; returns empty strings when neither locale has text.
 */
export function resolveSeriesCopy(
  series: Series | null | undefined,
  locale: string,
): ResolvedSeriesCopy | null {
  if (!series) return null;
  const want: SeriesCopyLocale = locale === "en" ? "en" : "uk";
  const primary = localeFromSeries(series, want);

  if (want === "uk") {
    if (!hasText(primary)) return null;
    return {
      short: primary.short,
      full: primary.full,
      fullBullets: primary.fullBullets,
      fullBlocks: primary.fullBlocks ?? [],
      isFallbackUk: false,
      lang: "uk",
    };
  }

  if (hasText(primary)) {
    return {
      short: primary.short,
      full: primary.full,
      fullBullets: primary.fullBullets,
      fullBlocks: primary.fullBlocks ?? [],
      isFallbackUk: false,
      lang: "en",
    };
  }

  const uk = localeFromSeries(series, "uk");
  if (!hasText(uk)) return null;
  return {
    short: uk.short,
    full: uk.full,
    fullBullets: uk.fullBullets,
    fullBlocks: uk.fullBlocks ?? [],
    isFallbackUk: true,
    lang: "uk",
  };
}

/** Prefer EN short, else EN full (plain), for meta/OG when locale is en. */
export function seriesEnMetaText(series: Series | null | undefined): string {
  if (!series?.descriptions?.en) return "";
  const { short, full } = series.descriptions.en;
  if (short.trim()) return short.trim();
  if (full.trim()) {
    const plain = full.replace(/\s+/g, " ").trim();
    return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain;
  }
  return "";
}
