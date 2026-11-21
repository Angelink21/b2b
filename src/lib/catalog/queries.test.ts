import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetEnvCache } from "@/env";

import { getAll, getBySlug, getCategoryNavStats, getIndex } from "./queries";
import { getSnapshotAll } from "./index";

describe("async catalog queries (snapshot when no CATALOG_CSV_URL)", () => {
  const prevUrl = process.env.CATALOG_CSV_URL;

  beforeEach(() => {
    delete process.env.CATALOG_CSV_URL;
    resetEnvCache();
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.CATALOG_CSV_URL;
    else process.env.CATALOG_CSV_URL = prevUrl;
    resetEnvCache();
  });

  it("returns the build snapshot without network", async () => {
    expect(process.env.CATALOG_CSV_URL ?? "").toBe("");
    const expected = getSnapshotAll().length;
    const products = await getAll();
    expect(products).toHaveLength(expected);
    const sample = products[0]!;
    expect((await getBySlug(sample.slug))?.name).toBe(sample.name);
    expect(await getIndex()).toHaveLength(expected);
    const stats = await getCategoryNavStats();
    expect(stats.reduce((sum, s) => sum + s.count, 0)).toBe(expected);
  });
});
