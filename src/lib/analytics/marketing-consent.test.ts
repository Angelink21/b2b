/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getMarketingConsent,
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
  it("defaults to denied", () => {
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
    expect(hasMarketingConsent()).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
