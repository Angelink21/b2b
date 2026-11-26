type DataLayerEntry = Record<string, string | number | boolean | undefined> & {
  event: string;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[];
  }
}

/**
 * Push a GTM-friendly event. Safe when dataLayer / GTM are absent.
 * Never include PII.
 */
export function pushDataLayerEvent(
  name: string,
  detail?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  const dataLayer = (window.dataLayer ??= []);
  dataLayer.push({
    event: name,
    ...detail,
  });
}
