import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  | "search_open"
  | "search_select"
  | "mobile_bar_quote"
  | "mobile_bar_call"
  | "mobile_bar_messenger"
  | "quote_open"
  | "quote_success"
  | "lineup_use"
  | "compare_add";

type AnalyticsDetail = Record<string, string | number | boolean>;

/**
 * Cookie-less analytics hook. Dispatches a document event, Vercel Analytics
 * custom event, and a dev console log. Never include PII.
 */
export function trackEvent(
  name: AnalyticsEvent,
  detail?: AnalyticsDetail,
): void {
  if (typeof window === "undefined") return;
  const payload = { name, ...detail };
  window.dispatchEvent(new CustomEvent("fagor:analytics", { detail: payload }));
  track(name, detail);
  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", payload);
  }
}
