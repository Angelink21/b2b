import { describe, expect, it } from "vitest";

import { siteConfig, visibleContact } from "./site";

describe("site contact slot", () => {
  it("hides empty contact fields", () => {
    expect(visibleContact("")).toBeNull();
    expect(visibleContact("   ")).toBeNull();
    expect(visibleContact(" +380 00 000 00 00 ")).toBe("+380 00 000 00 00");
  });

  it("keeps phone/email/hours/address empty until the owner confirms", () => {
    expect(siteConfig.logo.src).toBe("");
    expect(visibleContact(siteConfig.phone)).toBeNull();
    expect(visibleContact(siteConfig.email)).toBeNull();
    expect(visibleContact(siteConfig.hours)).toBeNull();
    expect(visibleContact(siteConfig.address)).toBeNull();
  });
});
