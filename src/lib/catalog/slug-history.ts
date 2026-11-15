/**
 * Persist old→new model URL redirects when a rename is detectable
 * via imageKey / image_id.
 */

export type SlugRedirect = {
  fromSlug: string;
  fromCategory: string;
  toSlug: string;
  toCategory: string;
  /** Stable identity used for matching across renames. */
  identityKey: string;
};

export type SlugHistoryFile = {
  version: 1;
  updatedAt: string;
  redirects: SlugRedirect[];
};

export type CatalogIdentityRow = {
  slug: string;
  name: string;
  category: string;
  imageKey: string;
  imageId?: string | null;
};

export function identityKeyFor(row: CatalogIdentityRow): string {
  const id = row.imageId?.trim();
  if (id) return `image_id:${id}`;
  return `imageKey:${row.imageKey.trim()}`;
}

export function emptySlugHistory(now = new Date()): SlugHistoryFile {
  return {
    version: 1,
    updatedAt: now.toISOString(),
    redirects: [],
  };
}

/**
 * Merge new renames into history. Updates chains so A→B then B→C becomes A→C, B→C.
 * Drops redirects whose `fromSlug` is still a live model slug.
 */
export function updateSlugHistory(
  previous: SlugHistoryFile | null,
  prevProducts: CatalogIdentityRow[],
  nextProducts: CatalogIdentityRow[],
  now = new Date(),
): SlugHistoryFile {
  const base = previous ?? emptySlugHistory(now);
  const prevByIdentity = new Map<string, CatalogIdentityRow>();
  for (const p of prevProducts) {
    const key = identityKeyFor(p);
    if (key.endsWith(":")) continue;
    prevByIdentity.set(key, p);
  }

  const nextByIdentity = new Map<string, CatalogIdentityRow>();
  const liveSlugs = new Set<string>();
  for (const p of nextProducts) {
    liveSlugs.add(p.slug);
    nextByIdentity.set(identityKeyFor(p), p);
  }

  const byFrom = new Map<string, SlugRedirect>();
  for (const r of base.redirects) {
    byFrom.set(r.fromSlug, { ...r });
  }

  for (const [key, prev] of prevByIdentity) {
    const next = nextByIdentity.get(key);
    if (!next) continue;
    if (prev.slug === next.slug && prev.category === next.category) continue;

    byFrom.set(prev.slug, {
      fromSlug: prev.slug,
      fromCategory: prev.category,
      toSlug: next.slug,
      toCategory: next.category,
      identityKey: key,
    });
  }

  // Flatten chains: if from→mid and mid→to, point from→to.
  const resolve = (slug: string, category: string): { slug: string; category: string } => {
    let s = slug;
    let c = category;
    const seen = new Set<string>();
    while (byFrom.has(s) && !seen.has(s)) {
      seen.add(s);
      const hop = byFrom.get(s)!;
      s = hop.toSlug;
      c = hop.toCategory;
    }
    return { slug: s, category: c };
  };

  for (const [from, r] of [...byFrom.entries()]) {
    const dest = resolve(r.toSlug, r.toCategory);
    byFrom.set(from, {
      ...r,
      toSlug: dest.slug,
      toCategory: dest.category,
    });
  }

  // Drop self-redirects and redirects from still-live slugs.
  const redirects = [...byFrom.values()].filter(
    (r) =>
      r.fromSlug !== r.toSlug &&
      !liveSlugs.has(r.fromSlug) &&
      liveSlugs.has(r.toSlug),
  );

  redirects.sort((a, b) => a.fromSlug.localeCompare(b.fromSlug));

  return {
    version: 1,
    updatedAt: now.toISOString(),
    redirects,
  };
}

export type NextRedirect = {
  source: string;
  destination: string;
  statusCode: 301;
};

/** Build next.config redirects for both locales via `:locale` param. */
export function toNextRedirects(history: SlugHistoryFile): NextRedirect[] {
  return history.redirects.map((r) => ({
    source: `/:locale/catalog/${r.fromCategory}/${r.fromSlug}`,
    destination: `/:locale/catalog/${r.toCategory}/${r.toSlug}`,
    statusCode: 301 as const,
  }));
}

export type CatalogDiff = {
  added: string[];
  removed: string[];
  changed: string[];
  renamed: { from: string; to: string; identityKey: string }[];
};

export function diffCatalogByName(
  prevProducts: CatalogIdentityRow[],
  nextProducts: CatalogIdentityRow[],
): CatalogDiff {
  const prevNames = new Map(prevProducts.map((p) => [p.name, p]));
  const nextNames = new Map(nextProducts.map((p) => [p.name, p]));

  const added = [...nextNames.keys()]
    .filter((n) => !prevNames.has(n))
    .sort((a, b) => a.localeCompare(b, "uk"));
  const removed = [...prevNames.keys()]
    .filter((n) => !nextNames.has(n))
    .sort((a, b) => a.localeCompare(b, "uk"));

  const changed: string[] = [];
  for (const [name, next] of nextNames) {
    const prev = prevNames.get(name);
    if (!prev) continue;
    if (
      prev.slug !== next.slug ||
      prev.category !== next.category ||
      prev.imageKey !== next.imageKey ||
      (prev.imageId ?? "") !== (next.imageId ?? "")
    ) {
      changed.push(name);
    }
  }
  changed.sort((a, b) => a.localeCompare(b, "uk"));

  const prevById = new Map(
    prevProducts.map((p) => [identityKeyFor(p), p] as const),
  );
  const renamed: CatalogDiff["renamed"] = [];
  for (const next of nextProducts) {
    const key = identityKeyFor(next);
    const prev = prevById.get(key);
    if (prev && prev.name !== next.name) {
      renamed.push({ from: prev.name, to: next.name, identityKey: key });
    }
  }
  renamed.sort((a, b) => a.from.localeCompare(b.from, "uk"));

  return { added, removed, changed, renamed };
}
