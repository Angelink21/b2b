import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import uk from "../../../messages/uk.json";

const COUNTS = [1, 2, 5, 8, 21, 303] as const;

describe("catalog.leadStats ICU plural", () => {
  it("uk: models and categories forms for 1, 2, 5, 8, 21, 303", () => {
    const t = createTranslator({
      locale: "uk",
      messages: { catalog: uk.catalog },
      namespace: "catalog",
    });

    const expected: Record<(typeof COUNTS)[number], string> = {
      1: "1 модель у 1 категорії",
      2: "2 моделі у 2 категоріях",
      5: "5 моделей у 5 категоріях",
      8: "8 моделей у 8 категоріях",
      21: "21 модель у 21 категорії",
      303: "303 моделі у 303 категоріях",
    };

    for (const n of COUNTS) {
      expect(t("leadStats", { models: n, categories: n })).toBe(expected[n]);
    }
  });

  it("en: models and categories forms for 1, 2, 5, 8, 21, 303", () => {
    const t = createTranslator({
      locale: "en",
      messages: { catalog: en.catalog },
      namespace: "catalog",
    });

    const expected: Record<(typeof COUNTS)[number], string> = {
      1: "1 model in 1 category",
      2: "2 models in 2 categories",
      5: "5 models in 5 categories",
      8: "8 models in 8 categories",
      21: "21 models in 21 categories",
      303: "303 models in 303 categories",
    };

    for (const n of COUNTS) {
      expect(t("leadStats", { models: n, categories: n })).toBe(expected[n]);
    }
  });
});
