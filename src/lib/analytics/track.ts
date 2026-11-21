export type AnalyticsEvent =
  | "search_open"
  | "search_select"
  | "mobile_bar_quote"
  | "mobile_bar_call"
  | "mobile_bar_messenger";

type AnalyticsDetail = Record<string, string | number | boolean>;

/**
 * Cookie-less analytics hook. Dispatches a document event and optional debug log.
 * Never include PII or raw search query text.
 */
export function trackEvent(name: AnalyticsEvent, detail?: AnalyticsDetail): void {
  if (typeof window === "undefined") return;
  const payload = { name, ...detail };
  window.dispatchEvent(new CustomEvent("fagor:analytics", { detail: payload }));
  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", payload);
  }
}