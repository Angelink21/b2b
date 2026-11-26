import { describe, expect, it } from "vitest";

import {
  collectFeatureQualityIssues,
  presentFeatureItem,
  presentFeatureItems,
} from "./present-features";

describe("presentFeatureItem", () => {
  it("trims, collapses spaces, drops trailing punctuation, capitalizes", () => {
    expect(presentFeatureItem("  зручний  екран. ")).toBe("Зручний екран");
    expect(presentFeatureItem("usb підключення;")).toBe("Usb підключення");
  });

  it("inserts NBSP between number and unit without changing inner case", () => {
    const out = presentFeatureItem("завантаження 18 кг");
    expect(out).toBe("Завантаження 18\u00a0кг");
    expect(presentFeatureItem("USB Підключення")).toBe("USB Підключення");
  });

  it("filters empty after polish", () => {
    expect(presentFeatureItems(["  ", ".", "ok"])).toEqual(["Ok"]);
  });
});

describe("collectFeatureQualityIssues", () => {
  it("flags trailing period, double spaces, mixed script, mid capitals", () => {
    const issues = collectFeatureQualityIssues([
      {
        id: "s-1",
        label: "Test",
        items: [
          "Барабан  з сталі.",
          "Зручний Екран сенсорний",
          "Модель тaблет", // Latin 'a' mixed — actually т is cyrillic, a is latin
        ],
      },
    ]);
    const joined = issues.map((i) => i.problems.join("|")).join(" || ");
    expect(joined).toMatch(/trailing period/);
    expect(joined).toMatch(/double spaces/);
    expect(joined).toMatch(/mid-phrase capital|mixed Latin/i);
  });
});
