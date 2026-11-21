import { describe, expect, it } from "vitest";

import { getSnapshotAll as getAll, getSnapshotFamily as getFamily } from "./index";
import { summarizeFamily } from "./family-diff";

describe("summarizeFamily", () => {
  it("lists current first and marks differing fields on siblings", () => {
    const multi = getAll().find((p) => getFamily(p.familyId).length > 1);
    expect(multi).toBeTruthy();
    if (!multi) return;

    const family = getFamily(multi.familyId);
    const summary = summarizeFamily(multi, family);

    expect(summary[0]?.slug).toBe(multi.slug);
    expect(summary.length).toBe(family.length);

    const sibling = summary.find((m) => m.slug !== multi.slug);
    expect(sibling).toBeTruthy();
    expect(sibling?.differingFields.length).toBeGreaterThan(0);
  });
});
