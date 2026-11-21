import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FetchCatalogCsv } from "./csv-source";
import { getSnapshotAll } from "./index";
import {
  __resetSheetCooldownForTests,
  __setNowForTests,
  buildSnapshotResult,
  loadCatalogFromSheet,
  resolveCatalogWithFallback,
  RUNTIME_FETCH_RETRIES,
  SHEET_COOLDOWN_MS,
} from "./runtime";

const ROOT = path.join(__dirname, "../../..");
const FULL_CSV = fs.readFileSync(
  path.join(ROOT, "data", "products_clean.csv"),
  "utf8",
);
const SNAPSHOT_COUNT = getSnapshotAll().length;

afterEach(() => {
  __resetSheetCooldownForTests();
  __setNowForTests(null);
  vi.restoreAllMocks();
});

function mockFetch(impl: (url: string) => Promise<Response>): FetchCatalogCsv {
  return async (url) => impl(url);
}

describe("loadCatalogFromSheet", () => {
  it("loads a successful CSV response as source=sheet", async () => {
    const fetchImpl = mockFetch(async () => new Response(FULL_CSV, { status: 200 }));
    const result = await loadCatalogFromSheet({
      url: "https://example.test/catalog.csv",
      fetchImpl,
    });
    expect(result.meta.source).toBe("sheet");
    expect(result.meta.errors).toEqual([]);
    expect(result.meta.modelCount).toBeGreaterThanOrEqual(303);
    expect(result.data.products).toHaveLength(result.meta.modelCount);
    expect(result.data.index).toHaveLength(result.meta.modelCount);
  });

  it("does not network again during the 60s cooldown after failure", async () => {
    let now = 1_000_000;
    __setNowForTests(() => now);

    const fetchImpl = vi.fn<FetchCatalogCsv>(async () => {
      throw new Error("network down");
    });

    await expect(
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    ).rejects.toThrow(/network down|CSV download failed/);

    expect(fetchImpl).toHaveBeenCalledTimes(RUNTIME_FETCH_RETRIES);

    await expect(
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    ).rejects.toThrow(/cooldown/);

    expect(fetchImpl).toHaveBeenCalledTimes(RUNTIME_FETCH_RETRIES);

    now += SHEET_COOLDOWN_MS + 1;
    await expect(
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    ).rejects.toThrow(/network down|CSV download failed/);

    expect(fetchImpl).toHaveBeenCalledTimes(RUNTIME_FETCH_RETRIES * 2);
  });

  it("treats HTML as failure and arms cooldown", async () => {
    const fetchImpl = vi.fn<FetchCatalogCsv>(async () =>
      new Response("<!DOCTYPE html><html><body>login</body></html>", {
        status: 200,
      }),
    );

    await expect(
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    ).rejects.toThrow(/HTML/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await expect(
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    ).rejects.toThrow(/cooldown/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("resolveCatalogWithFallback", () => {
  it("returns snapshot with errors when the loader throws", async () => {
    const result = await resolveCatalogWithFallback(async () => {
      throw new Error("sheet unavailable");
    });
    expect(result.meta.source).toBe("snapshot");
    expect(result.meta.modelCount).toBe(SNAPSHOT_COUNT);
    expect(result.meta.errors.some((e) => /unavailable|sheet/i.test(e))).toBe(
      true,
    );
    expect(result.data.products).toHaveLength(SNAPSHOT_COUNT);
  });
});

describe("buildSnapshotResult", () => {
  it("marks source=snapshot and copies errors", () => {
    const result = buildSnapshotResult(["boom"]);
    expect(result.meta.source).toBe("snapshot");
    expect(result.meta.errors).toEqual(["boom"]);
    expect(result.data.series.length).toBeGreaterThan(0);
  });

  it("uses a stable builtAt timestamp (no Date.now)", () => {
    __setNowForTests(() => 9_999_999_999_000);
    const result = buildSnapshotResult();
    expect(result.meta.fetchedAt).not.toBe(
      new Date(9_999_999_999_000).toISOString(),
    );
    expect(Number.isNaN(Date.parse(result.meta.fetchedAt))).toBe(false);
  });
});
