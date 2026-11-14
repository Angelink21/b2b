import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function flatten(obj: Json, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return [prefix];
  }
  return Object.entries(obj).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n key parity", () => {
  const uk = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../messages/uk.json"), "utf8"),
  ) as Json;
  const en = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../messages/en.json"), "utf8"),
  ) as Json;

  it("uk and en share the same keys", () => {
    const ukKeys = flatten(uk).sort();
    const enKeys = flatten(en).sort();
    expect(enKeys).toEqual(ukKeys);
  });
});
