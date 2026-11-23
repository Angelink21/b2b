import { describe, expect, it } from "vitest";

import { routing } from "./routing";

describe("routing", () => {
  it("keeps uk as default and disables Accept-Language detection", () => {
    expect(routing.defaultLocale).toBe("uk");
    expect(routing.locales).toEqual(["uk", "en"]);
    expect(routing.localeDetection).toBe(false);
  });
});
