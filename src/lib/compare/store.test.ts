import { describe, expect, it } from "vitest";

import {
  getServerCompareReadySnapshot,
  getServerCompareSlugsSnapshot,
} from "./store";

describe("compare store server snapshots", () => {
  it("returns a stable slugs array identity for useSyncExternalStore", () => {
    expect(getServerCompareSlugsSnapshot()).toBe(getServerCompareSlugsSnapshot());
    expect(getServerCompareSlugsSnapshot()).toEqual([]);
  });

  it("returns a stable ready boolean", () => {
    expect(getServerCompareReadySnapshot()).toBe(false);
    expect(getServerCompareReadySnapshot()).toBe(getServerCompareReadySnapshot());
  });
});
