import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/catalog/schema";

import { normalizeSearchQuery } from "./query";

export const RECENT_MODELS_KEY = "fagor-recent-models";
export const RECENT_MODELS_MAX = 8;
export const SEARCH_RESULTS_MAX = 8;

export type GlobalSearchItem = {
  slug: string;
  name: string;
  category: CategorySlug;
  photo: null | {
    loaderSrc: string;
    width: number;
    height: number;
    alt: string;
  };
  dimensionsMm: { w: number; d: number; h: number };
  loadKg: { min: number; max: number } | null;
  powerKwMax: number | null;
  workingWidthMm: number | null;
  volumeL: number | null;
};

export type SearchResultGroup = {
  category: CategorySlug;
  items: GlobalSearchItem[];
};

export function readRecentModelSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_MODELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slugs: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      const slug = entry.trim();
      if (!slug || slugs.includes(slug)) continue;
      slugs.push(slug);
      if (slugs.length >= RECENT_MODELS_MAX) break;
    }
    return slugs;
  } catch {
    return [];
  }
}

export function rememberModelSlug(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readRecentModelSlugs().filter((s) => s !== slug);
    const next = [slug, ...prev].slice(0, RECENT_MODELS_MAX);
    window.localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(next));
  } catch {
    // storage blocked
  }
}

export function groupSearchResults(
  items: readonly GlobalSearchItem[],
  query: string,
): SearchResultGroup[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = normalizeSearchQuery(trimmed);
  const pool = items.filter((item) => searchHaystack(item.name).includes(needle));

  const groups: SearchResultGroup[] = [];
  let remaining = SEARCH_RESULTS_MAX;
  for (const category of CATEGORY_SLUGS) {
    if (remaining <= 0) break;
    const inCategory = pool.filter((item) => item.category === category);
    if (inCategory.length === 0) continue;
    const slice = inCategory.slice(0, remaining);
    groups.push({ category, items: slice });
    remaining -= slice.length;
  }
  return groups;
}

export function recentSearchItems(
  items: readonly GlobalSearchItem[],
  slugs: readonly string[],
): GlobalSearchItem[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const result: GlobalSearchItem[] = [];
  for (const slug of slugs) {
    const hit = bySlug.get(slug);
    if (hit) result.push(hit);
    if (result.length >= SEARCH_RESULTS_MAX) break;
  }
  return result;
}

export function searchHaystack(name: string): string {
  return normalizeSearchQuery(name);
}