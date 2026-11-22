import { describe, expect, it } from "vitest";

import {
  buildPlanHash,
  decodePlanPayload,
  encodePlanPayload,
  parsePlanHash,
  planPayloadFromState,
} from "./plan-hash";

describe("plan-hash", () => {
  const payload = planPayloadFromState({
    roomWidthM: 6,
    roomLengthM: 4,
    gapMm: 100,
    placements: {
      "lap-08-tp2-e": { xMm: 100, yMm: 100, rotation: 0 },
      "lap-08-tp2-e-p": { xMm: 1000, yMm: 100, rotation: 1 },
    },
    hiddenSlugs: ["hidden-slug"],
  });

  it("round-trips encode/decode", () => {
    const encoded = encodePlanPayload(payload);
    expect(decodePlanPayload(encoded)).toEqual(payload);
  });

  it("parses hash fragment", () => {
    const hash = buildPlanHash(payload);
    expect(hash.startsWith("#fp=")).toBe(true);
    expect(parsePlanHash(hash)).toEqual(payload);
  });

  it("rejects corrupt payloads", () => {
    expect(decodePlanPayload("!!!")).toBeNull();
    expect(parsePlanHash("#fp=not-valid")).toBeNull();
    expect(parsePlanHash("")).toBeNull();
  });
});
