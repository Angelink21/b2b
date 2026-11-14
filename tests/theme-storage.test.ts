import { describe, expect, it } from "vitest";
import { isThemePreference } from "@/lib/theme/storage";

describe("theme preference", () => {
  it("accepts light dark system", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("neon")).toBe(false);
  });
});
