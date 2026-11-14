/**
 * Editorial “where to start” models on the home page.
 * Chosen by prototype heuristic: washer≈25 kg, dryer≈25 kg,
 * first flatwork-ironer / ironing-roller by slug; dryer tie-break
 * prefers non-stack (no `-2-` in slug).
 */
export const FEATURED_SLUGS = [
  "la-22-tp2-e",
  "sc-22-m-e",
  "ps-20-140-m-e",
  "p-18-100-m-e",
] as const;

export type FeaturedSlug = (typeof FEATURED_SLUGS)[number];
