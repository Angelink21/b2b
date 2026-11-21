import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getEnv, resetEnvCache } from "@/env";

import { REQUIRED_CSV_COLUMNS, type FetchCatalogCsv } from "./csv-source";
import { getSnapshotAll } from "./index";
import {
  __resetSheetCooldownForTests,
  loadCatalogFromSheet,
  redactCatalogSecrets,
  resolveCatalogWithFallback,
} from "./runtime";

const FIX = path.join(__dirname, "fixtures");
const SNAPSHOT_COUNT = getSnapshotAll().length;

function readFix(name: string): string {
  return fs.readFileSync(path.join(FIX, name), "utf8");
}

afterEach(() => {
  __resetSheetCooldownForTests();
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("catalog runtime protection", () => {
  it("contract still has 22 required columns", () => {
    expect(REQUIRED_CSV_COLUMNS).toHaveLength(22);
  });

  it("redacts absolute URLs from log messages", () => {
    const raw =
      "CSV download failed (https://docs.google.com/spreadsheets/d/e/2PACX-SECRET/pub?output=csv): boom";
    const safe = redactCatalogSecrets(raw);
    expect(safe).not.toContain("2PACX-SECRET");
    expect(safe).not.toContain("https://");
    expect(safe).toContain("[redacted-url]");
  });

  it("falls back to snapshot when headers miss a required column", async () => {
    const fetchImpl: FetchCatalogCsv = async () =>
      new Response(readFix("csv-missing-column.csv"), { status: 200 });

    const result = await resolveCatalogWithFallback(() =>
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    );

    expect(result.meta.source).toBe("snapshot");
    expect(result.meta.modelCount).toBe(SNAPSHOT_COUNT);
    expect(result.meta.errors.join(" ")).toMatch(/missing columns/i);
    expect(result.data.products).toHaveLength(SNAPSHOT_COUNT);
  });

  it("falls back to snapshot when the sheet shrinks below 80%", async () => {
    const fetchImpl: FetchCatalogCsv = async () =>
      new Response(readFix("csv-tiny.csv"), { status: 200 });

    await expect(
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
        baselineCount: SNAPSHOT_COUNT,
        allowShrink: false,
      }),
    ).rejects.toThrow(/уменьшился|80%/);

    const result = await resolveCatalogWithFallback(() =>
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
        baselineCount: SNAPSHOT_COUNT,
        allowShrink: false,
      }),
    );

    // First call armed cooldown after shrink? Shrink does NOT arm cooldown —
    // second load still hits network. Fallback still returns snapshot.
    expect(result.meta.source).toBe("snapshot");
    expect(result.meta.modelCount).toBe(SNAPSHOT_COUNT);
    expect(result.meta.errors.join(" ")).toMatch(/уменьшился|80%/);
  });

  it("falls back to snapshot when HTML is returned", async () => {
    const fetchImpl: FetchCatalogCsv = async () =>
      new Response("<!DOCTYPE html><html><body>Sign in</body></html>", {
        status: 200,
      });

    const result = await resolveCatalogWithFallback(() =>
      loadCatalogFromSheet({
        url: "https://example.test/catalog.csv",
        fetchImpl,
      }),
    );

    expect(result.meta.source).toBe("snapshot");
    expect(result.meta.errors.join(" ")).toMatch(/HTML/);
    expect(result.data.products).toHaveLength(SNAPSHOT_COUNT);
  });

  it("getEnv catalog secrets are optional and do not break without them", () => {
    delete process.env.CATALOG_STATUS_SECRET;
    delete process.env.CATALOG_CSV_URL;
    resetEnvCache();
    const env = getEnv();
    expect(env.catalogCsvUrl).toBeNull();
    expect(env.catalogStatusSecret).toBeNull();
    expect(env.catalogAllowShrink).toBe(false);
    expect(env.catalogCacheRevalidateSeconds).toBe(300);
  });
});
