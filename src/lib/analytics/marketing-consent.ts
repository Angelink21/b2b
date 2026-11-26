/**
 * Marketing consent gate for third-party tags (GTM / Ads).
 * Default is denied. Banner UI is a follow-up; until then GTM never loads.
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

export function getMarketingConsent(): MarketingConsent {
  if (!isBrowser()) return "denied";
  try {
    const raw = window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY);
    return raw === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
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
