import { describe, expect, it } from "vitest";

import {
  localizedHours,
  siteConfig,
  telHref,
  visibleContact,
  visiblePhones,
} from "./site";

describe("site contact slot", () => {
  it("hides empty contact fields", () => {
    expect(visibleContact("")).toBeNull();
    expect(visibleContact("   ")).toBeNull();
    expect(visibleContact(" +380 00 000 00 00 ")).toBe("+380 00 000 00 00");
  });

  it("exposes owner-confirmed phone, email, hours, address, and logos", () => {
    expect(siteConfig.logo.src).toBe("/brand/fagor-logo.png");
    expect(siteConfig.logoDark.src).toBe("/brand/fagor-logo-dark.png");
    expect(siteConfig.logo.width).toBeGreaterThan(0);
    expect(siteConfig.logo.height).toBeGreaterThan(0);
    expect(visiblePhones()).toEqual(["044-501-88-87", "050-382-48-78"]);
    expect(visibleContact(siteConfig.email)).toBe("pkmprofessional@ukr.net");
    expect(localizedHours("uk")).toContain("Пн–Пт");
    expect(localizedHours("en")).toContain("Mon–Fri");
    expect(visibleContact(siteConfig.address)).toContain("Вишневе");
  });

  it("builds Ukrainian tel: hrefs with +38", () => {
    expect(telHref("044-501-88-87")).toBe("tel:+380445018887");
    expect(telHref("050-382-48-78")).toBe("tel:+380503824878");
  });
});
