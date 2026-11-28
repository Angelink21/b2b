/**
 * Marketing consent gate for third-party tags (GTM / Ads).
 * No stored choice → banner shows; GTM loads only when granted.
 */

export const MARKETING_CONSENT_STORAGE_KEY = "fagor-marketing-consent";
export const MARKETING_CONSENT_EVENT = "fagor:marketing-consent";

export type MarketingConsent = "granted" | "denied";

export type MarketingConsentDetail = {
  consent: MarketingConsent;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Stored choice, or `null` when the visitor has not answered yet. */
export function getStoredMarketingConsent(): MarketingConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY);
    if (raw === "granted" || raw === "denied") return raw;
    return null;
  } catch {
    return null;
  }
}

/** Effective gate for tags: granted or denied (unset counts as denied). */
export function getMarketingConsent(): MarketingConsent {
  return getStoredMarketingConsent() === "granted" ? "granted" : "denied";
}

export function hasMarketingConsent(): boolean {
  return getMarketingConsent() === "granted";
}

export function setMarketingConsent(consent: MarketingConsent): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Private mode / blocked storage — still broadcast so this session can react.
  }
  window.dispatchEvent(
    new CustomEvent<MarketingConsentDetail>(MARKETING_CONSENT_EVENT, {
      detail: { consent },
    }),
  );
}
