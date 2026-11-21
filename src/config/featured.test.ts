import { describe, expect, it } from "vitest";

import { getSnapshotBySlug as getBySlug } from "@/lib/catalog";

import { FEATURED_SLUGS } from "./featured";

describe("FEATURED_SLUGS", () => {
  it("every slug exists in the catalog", () => {
    for (const slug of FEATURED_SLUGS) {
      const product = getBySlug(slug);
      expect(product, `missing featured slug: ${slug}`).toBeDefined();
    }
  });
});
