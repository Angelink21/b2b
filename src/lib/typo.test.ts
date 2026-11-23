import { describe, expect, it } from "vitest";

import { typo } from "./typo";

describe("typo", () => {
  it("glues short Ukrainian words with a non-breaking space", () => {
    expect(typo("Скільки кілограмів за один цикл?")).toBe(
      "Скільки кілограмів за\u00A0один цикл?",
    );
    expect(typo("Готелі та ресторани")).toBe("Готелі та\u00A0ресторани");
    expect(typo("Модель і нагрів")).toBe("Модель і\u00A0нагрів");
    expect(typo("від до краю")).toBe("від\u00A0до краю");
    expect(typo("по плану")).toBe("по\u00A0плану");
    expect(typo("а також")).toBe("а\u00A0також");
  });

  it("does not chain three or more words into one unbreakable run", () => {
    expect(typo("в комерційних і промислових")).toBe(
      "в\u00A0комерційних і\u00A0промислових",
    );
    expect(typo("від до на краю")).toBe("від\u00A0до на\u00A0краю");
  });

  it("does not glue letters inside a longer word", () => {
    expect(typo("навантаження та вага")).toBe("навантаження та\u00A0вага");
    expect(typo("Industrial")).toBe("Industrial");
  });
});
