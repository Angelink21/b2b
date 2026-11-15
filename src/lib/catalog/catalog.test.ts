import { gzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  __setCatalogForTests,
  __setIndexForTests,
  facets,
  getAll,
  getByCategory,
  getBySlug,
  getFamily,
  getIndex,
  getRelated,
} from "./index";
import {
  CATEGORY_SLUGS,
  catalogGeneratedSchema,
  catalogIndexSchema,
  type CatalogGenerated,
  type CatalogIndex,
} from "./schema";
import { facetsForCategory } from "@/config/facets";

import { facetRangeBounds, filterProducts, searchProducts, sortProducts } from "./query";
import { getModelImage } from "@/lib/images";

const root = path.resolve(__dirname, "../../..");
const generatedPath = path.join(root, "src/data/catalog.generated.json");
const indexPath = path.join(root, "src/data/catalog.index.json");

function loadGenerated(): CatalogGenerated {
  const raw = JSON.parse(fs.readFileSync(generatedPath, "utf8")) as unknown;
  return catalogGeneratedSchema.parse(raw);
}

function loadIndexFile(): CatalogIndex {
  const raw = JSON.parse(fs.readFileSync(indexPath, "utf8")) as unknown;
  return catalogIndexSchema.parse(raw);
}

describe("generated catalog", () => {
  const catalog = loadGenerated();
  const index = loadIndexFile();

  it("has 303 models, 0 duplicate slugs, 8 categories", () => {
    expect(catalog.products).toHaveLength(303);
    const slugs = catalog.products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(303);
    const categories = new Set(catalog.products.map((p) => p.category));
    expect(categories.size).toBe(8);
    for (const slug of CATEGORY_SLUGS) {
      expect(categories.has(slug)).toBe(true);
    }
  });

  it("keeps image null and imageKey present", () => {
    for (const p of catalog.products) {
      expect(p.image).toBeNull();
      expect(p.imageKey.length).toBeGreaterThan(0);
    }
  });

  it("parses real CSV examples on live products", () => {
    const withNote = catalog.products.find((p) => p.dimensionsMm.note);
    expect(withNote?.dimensionsMm.note).toBe("з колесами");

    const lessThan = catalog.products.find((p) => p.noiseDb?.lessThan);
    expect(lessThan?.noiseDb).toMatchObject({ lessThan: true });

    const noiseAlt = catalog.products.find((p) => p.noiseDb?.alt !== undefined);
    expect(noiseAlt?.noiseDb).toMatchObject({ value: 62, alt: 72 });

    const powerAlt = catalog.products.find((p) => p.powerKw?.alt !== undefined);
    expect(powerAlt?.powerKw?.alt).toBeTypeOf("number");

    const gasVariant = catalog.products.find(
      (p) => p.heatingVariant !== undefined,
    );
    expect(gasVariant?.heating).toBe("gas");
  });

  it("index.json gzip size is ≤ 40 KB", () => {
    const raw = fs.readFileSync(indexPath);
    const gz = gzipSync(raw);
    expect(gz.byteLength).toBeLessThanOrEqual(40 * 1024);
  });

  it("index has same slug set as generated", () => {
    expect(index.products).toHaveLength(303);
    const genSlugs = new Set(catalog.products.map((p) => p.slug));
    for (const item of index.products) {
      expect(genSlugs.has(item.slug)).toBe(true);
    }
  });
});

describe("catalog API", () => {
  const catalog = loadGenerated();
  const index = loadIndexFile();

  it("getBySlug / getByCategory / getFamily / getRelated / facets", () => {
    __setCatalogForTests(catalog);
    __setIndexForTests(index);

    expect(getAll()).toHaveLength(303);

    const sample = catalog.products.find((p) => p.variantLabel !== null)!;
    expect(getBySlug(sample.slug)?.name).toBe(sample.name);

    const washers = getByCategory("washers");
    expect(washers.length).toBe(88);
    expect(washers.every((p) => p.category === "washers")).toBe(true);

    const family = getFamily(sample.familyId);
    expect(family.length).toBeGreaterThanOrEqual(1);
    expect(family.every((p) => p.familyId === sample.familyId)).toBe(true);

    const related = getRelated(sample.slug, 3);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related.every((p) => p.familyId !== sample.familyId)).toBe(true);
    expect(related.every((p) => p.category === sample.category)).toBe(true);

    const f = facets();
    expect(f.count).toBe(303);
    expect(f.categories.washers).toBe(88);
    expect(f.kg).not.toBeNull();

    __setCatalogForTests(null);
    __setIndexForTests(null);
  });

  it("filter / sort / search", () => {
    __setIndexForTests(index);
    const items = getIndex();

    const gas = filterProducts(items, { heating: "gas", category: "dryers" });
    expect(
      gas.every((p) => p.heating === "gas" && p.category === "dryers"),
    ).toBe(true);

    const sorted = sortProducts(gas, { by: "kg", dir: "desc" });
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!.loadKg?.max ?? -1;
      const cur = sorted[i]!.loadKg?.max ?? -1;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }

    const found = searchProducts(items, "lap-08");
    expect(found.some((p) => /lap.?08/i.test(p.name.replace(/\s+/g, "")))).toBe(
      true,
    );

    const rollers = items.filter((item) => item.category === "ironing-rollers");
    const withStrayKg = filterProducts(rollers, {
      category: "ironing-rollers",
      kg: { min: 10, max: 20 },
      allowed: facetsForCategory("ironing-rollers"),
    });
    expect(withStrayKg).toHaveLength(rollers.length);
    expect(facetRangeBounds(rollers, "kg")).toBeNull();
    expect(facetRangeBounds(rollers, "width")).not.toBeNull();

    const carts = items.filter((item) => item.category === "laundry-carts");
    expect(facetRangeBounds(carts, "volume")).not.toBeNull();
    expect(facetRangeBounds(carts, "kg")).toBeNull();

    __setIndexForTests(null);
  });
});

describe("getModelImage", () => {
  it("returns null or a photo object without throwing", () => {
    const product = loadGenerated().products[0]!;
    const photo = getModelImage(product);
    if (photo === null) {
      expect(photo).toBeNull();
    } else {
      expect(photo.url).toContain("res.cloudinary.com/");
      expect(photo.publicId.length).toBeGreaterThan(0);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
    }
  });
});
