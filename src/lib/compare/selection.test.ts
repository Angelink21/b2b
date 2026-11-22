import { afterEach, describe, expect, it } from "vitest";

import {
  COMPARE_MAX,
  COMPARE_STORAGE_KEY,
  addSlug,
  normalizeSlugs,
  parseCompareQuery,
  readCompareSlugsFromStorage,
  removeSlug,
  resolveInitialSlugs,
  toggleSlug,
  writeCompareSlugsToStorage,
} from "./selection";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("normalizeSlugs / parseCompareQuery", () => {
  it("dedupes and caps at COMPARE_MAX", () => {
    expect(
      normalizeSlugs(["a", "a", "b", "c", "d", "e", ""]),
    ).toEqual(["a", "b", "c", "d"]);
    expect(COMPARE_MAX).toBe(4);
  });

  it("parses comma query", () => {
    expect(parseCompareQuery("a, b, a, c")).toEqual(["a", "b", "c"]);
    expect(parseCompareQuery(null)).toEqual([]);
  });
});

describe("toggleSlug / addSlug / removeSlug", () => {
  it("adds and removes", () => {
    expect(toggleSlug([], "a")).toEqual({
      kind: "added",
      slugs: ["a"],
      added: "a",
    });
    expect(toggleSlug(["a"], "a")).toEqual({
      kind: "removed",
      slugs: [],
      removed: "a",
    });
    expect(removeSlug(["a", "b"], "a")).toEqual(["b"]);
  });

  it("enforces limit 4", () => {
    const full = ["a", "b", "c", "d"];
    expect(toggleSlug(full, "e")).toEqual({ kind: "limit", slugs: full });
    expect(addSlug(full, "e")).toEqual({ kind: "limit", slugs: full });
  });
});

describe("localStorage round-trip", () => {
  afterEach(() => {
    // no global pollution
  });

  it("writes and restores", () => {
    const storage = memoryStorage();
    writeCompareSlugsToStorage(["x", "y"], storage);
    expect(readCompareSlugsFromStorage(storage)).toEqual(["x", "y"]);
    writeCompareSlugsToStorage([], storage);
    expect(storage.getItem(COMPARE_STORAGE_KEY)).toBeNull();
  });

  it("survives corrupt JSON", () => {
    const storage = memoryStorage({ [COMPARE_STORAGE_KEY]: "{not-json" });
    expect(readCompareSlugsFromStorage(storage)).toEqual([]);
  });
});

describe("resolveInitialSlugs", () => {
  it("prefers ?m= on /compare", () => {
    const storage = memoryStorage();
    writeCompareSlugsToStorage(["from-ls"], storage);
    expect(
      resolveInitialSlugs({
        pathname: "/uk/compare",
        search: "?m=alpha,beta",
        storage,
      }),
    ).toEqual(["alpha", "beta"]);
  });

  it("uses localStorage off compare page", () => {
    const storage = memoryStorage();
    writeCompareSlugsToStorage(["home"], storage);
    expect(
      resolveInitialSlugs({
        pathname: "/uk",
        search: "",
        storage,
      }),
    ).toEqual(["home"]);
  });
});
