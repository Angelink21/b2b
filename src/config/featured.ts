/**
 * Home flagship washers by load band: compact ~14 kg,
 * mid-commercial ~30 kg, large ~60 kg, industrial ~85 kg.
 * Electric high-spin LA line (G-factor from catalog).
 */
export const FEATURED_SLUGS = [
  "la-14-tp2-e",
  "la-28-tp2-e",
  "la-60c-tp2-e",
  "la-80c-tp2-e",
] as const;

export type FeaturedSlug = (typeof FEATURED_SLUGS)[number];

/** @deprecated Use FEATURED_SLUGS — same set for home flagship. */
export const FLAGSHIP_SLUGS = FEATURED_SLUGS;
