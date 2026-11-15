import { describe, expect, it } from "vitest";

import {
  diffCatalogByName,
  emptySlugHistory,
  toNextRedirects,
  updateSlugHistory,
  type CatalogIdentityRow,
} from "./slug-history";

const prev: CatalogIdentityRow[] = [
  {
    slug: "old-name",
    name: "Old Name",
    category: "washers",
    imageKey: "LAP-08.png",
  },
  {
    slug: "stable",
    name: "Stable",
    category: "dryers",
    imageKey: "SR-08.png",
  },
];

const next: CatalogIdentityRow[] = [
  {
    slug: "new-name",
    name: "New Name",
    category: "washers",
    imageKey: "LAP-08.png",
  },
  {
    slug: "stable",
    name: "Stable",
    category: "dryers",
    imageKey: "SR-08.png",
  },
];

describe("updateSlugHistory", () => {
  it("records 301 mapping when imageKey matches and slug changes", () => {
    const history = updateSlugHistory(emptySlugHistory(), prev, next);
    expect(history.redirects).toEqual([
      {
        fromSlug: "old-name",
        fromCategory: "washers",
        toSlug: "new-name",
        toCategory: "washers",
        identityKey: "imageKey:LAP-08.png",
      },
    ]);
  });

  it("flattens redirect chains", () => {
    const mid = updateSlugHistory(emptySlugHistory(), prev, next);
    const third: CatalogIdentityRow[] = [
      {
        slug: "newest",
        name: "Newest",
        category: "washers",
        imageKey: "LAP-08.png",
      },
      next[1]!,
    ];
    const history = updateSlugHistory(mid, next, third);
    const fromOld = history.redirects.find((r) => r.fromSlug === "old-name");
    expect(fromOld?.toSlug).toBe("newest");
    expect(history.redirects.some((r) => r.fromSlug === "new-name")).toBe(true);
  });

  it("prefers image_id for identity", () => {
    const a: CatalogIdentityRow[] = [
      {
        slug: "a",
        name: "A",
        category: "washers",
        imageKey: "file.png",
        imageId: "id-1",
      },
    ];
    const b: CatalogIdentityRow[] = [
      {
        slug: "b",
        name: "B",
        category: "washers",
        imageKey: "other.png",
        imageId: "id-1",
      },
    ];
    const history = updateSlugHistory(null, a, b);
    expect(history.redirects[0]?.identityKey).toBe("image_id:id-1");
  });
});

describe("toNextRedirects", () => {
  it("emits locale-aware 301 rules", () => {
    const history = updateSlugHistory(null, prev, next);
    expect(toNextRedirects(history)).toEqual([
      {
        source: "/:locale/catalog/washers/old-name",
        destination: "/:locale/catalog/washers/new-name",
        statusCode: 301,
      },
    ]);
  });
});

describe("diffCatalogByName", () => {
  it("lists added removed and renames", () => {
    const diff = diffCatalogByName(prev, next);
    expect(diff.removed).toEqual(["Old Name"]);
    expect(diff.added).toEqual(["New Name"]);
    expect(diff.renamed).toEqual([
      {
        from: "Old Name",
        to: "New Name",
        identityKey: "imageKey:LAP-08.png",
      },
    ]);
  });
});
