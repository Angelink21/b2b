import { describe, expect, it } from "vitest";

import { typo } from "./typo";

describe("typo", () => {
  it("glues short Ukrainian words with a non-breaking space", () => {
    expect(typo("Скільки кілограмів у зміну?")).toBe("Скільки кілограмів у\u00A0зміну?");
    expect(typo("Готелі та ресторани")).toBe("Готелі та\u00A0ресторани");
    expect(typo("Модель і нагрів")).toBe("Модель і\u00A0нагрів");
    expect(typo("від до краю")).toBe("від до\u00A0краю");
  });

  it("does not glue letters inside a longer word", () => {
    expect(typo("навантаження та вага")).toBe("навантаження та\u00A0вага");
    expect(typo("Industrial")).toBe("Industrial");
  });
});
