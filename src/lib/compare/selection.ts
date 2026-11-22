import { COMPARE_MAX } from "@/lib/catalog/search-params";

export const COMPARE_STORAGE_KEY = "fagor.compare.slugs";
export { COMPARE_MAX };

export function normalizeSlugs(input: readonly string[]): string[] {
  const unique: string[] = [];
  for (const raw of input) {
    const slug = raw.trim();
    if (!slug || unique.includes(slug)) continue;
    unique.push(slug);
    if (unique.length >= COMPARE_MAX) break;
  }
  return unique;
}

export function parseCompareQuery(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return normalizeSlugs(raw.split(","));
}

export function readCompareSlugsFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined,
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeSlugs(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return [];
  }
}

export function writeCompareSlugsToStorage(
  slugs: readonly string[],
  storage: Pick<Storage, "setItem" | "removeItem"> | null | undefined,
): void {
  if (!storage) return;
  try {
    const next = normalizeSlugs(slugs);
    if (next.length === 0) {
      storage.removeItem(COMPARE_STORAGE_KEY);
      return;
    }
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore.
  }
}

export type ToggleSlugResult =
  | { kind: "added"; slugs: string[]; added: string }
  | { kind: "removed"; slugs: string[]; removed: string }
  | { kind: "limit"; slugs: string[] };

export function toggleSlug(
  slugs: readonly string[],
  slug: string,
): ToggleSlugResult {
  const current = normalizeSlugs(slugs);
  const trimmed = slug.trim();
  if (!trimmed) return { kind: "limit", slugs: current };

  if (current.includes(trimmed)) {
    return {
      kind: "removed",
      slugs: current.filter((item) => item !== trimmed),
      removed: trimmed,
    };
  }

  if (current.length >= COMPARE_MAX) {
    return { kind: "limit", slugs: current };
  }

  return { kind: "added", slugs: [...current, trimmed], added: trimmed };
}

export function addSlug(
  slugs: readonly string[],
  slug: string,
): ToggleSlugResult {
  const current = normalizeSlugs(slugs);
  const trimmed = slug.trim();
  if (!trimmed) return { kind: "limit", slugs: current };
  if (current.includes(trimmed)) {
    return { kind: "added", slugs: current, added: trimmed };
  }
  if (current.length >= COMPARE_MAX) {
    return { kind: "limit", slugs: current };
  }
  return { kind: "added", slugs: [...current, trimmed], added: trimmed };
}

export function removeSlug(
  slugs: readonly string[],
  slug: string,
): string[] {
  return normalizeSlugs(slugs).filter((item) => item !== slug.trim());
}

/** Prefer URL slugs on /compare; otherwise localStorage. */
export function resolveInitialSlugs(opts: {
  pathname: string;
  search: string;
  storage: Pick<Storage, "getItem"> | null | undefined;
}): string[] {
  const onCompare = /\/compare\/?$/.test(opts.pathname);
  if (onCompare) {
    const params = new URLSearchParams(opts.search);
    const fromUrl = parseCompareQuery(params.get("m"));
    if (fromUrl.length > 0) return fromUrl;
  }
  return readCompareSlugsFromStorage(opts.storage);
}
