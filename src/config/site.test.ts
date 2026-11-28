import { describe, expect, it } from "vitest";

import {
  localizedAddress,
  localizedHours,
  mapsEmbedHref,
  mapsHref,
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
    expect(siteConfig.hoursEn).toContain("Mon–Fri");
    expect(visibleContact(siteConfig.address)).toContain("Вишневе");
    expect(localizedAddress("uk")).toContain("Вишневе");
    expect(localizedAddress("en")).toContain("Vyshneve");
    expect(localizedAddress("en")).not.toMatch(/[а-яА-ЯіІїЇєЄґҐ]/u);
    expect(siteConfig.legalName).toBe("Промкомплектмонтаж");
    expect(siteConfig.legalNameEn).toBe("Promkomplektmontazh");
    expect(mapsHref()).toBe("https://maps.app.goo.gl/Bym1u3NTiApW5RNu7");
    expect(mapsEmbedHref()).toContain("0x40d4ca3985d2f65b");
  });

  it("builds Ukrainian tel: hrefs with +38", () => {
    expect(telHref("044-501-88-87")).toBe("tel:+380445018887");
    expect(telHref("050-382-48-78")).toBe("tel:+380503824878");
  });
});
