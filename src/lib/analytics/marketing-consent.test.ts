/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getMarketingConsent,
  getStoredMarketingConsent,
  hasMarketingConsent,
  MARKETING_CONSENT_EVENT,
  MARKETING_CONSENT_STORAGE_KEY,
  setMarketingConsent,
} from "./marketing-consent";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("marketing consent", () => {
  it("defaults to no stored choice and denied for tags", () => {
    expect(getStoredMarketingConsent()).toBeNull();
    expect(getMarketingConsent()).toBe("denied");
    expect(hasMarketingConsent()).toBe(false);
  });

  it("persists grant and broadcasts", () => {
    const handler = vi.fn();
    window.addEventListener(MARKETING_CONSENT_EVENT, handler);

    setMarketingConsent("granted");

    expect(window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY)).toBe(
      "granted",
    );
    expect(getStoredMarketingConsent()).toBe("granted");
    expect(hasMarketingConsent()).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("persists decline without enabling tags", () => {
    setMarketingConsent("denied");
    expect(getStoredMarketingConsent()).toBe("denied");
    expect(hasMarketingConsent()).toBe(false);
  });
});
