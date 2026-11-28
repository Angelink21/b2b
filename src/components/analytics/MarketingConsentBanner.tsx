"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import {
  getStoredMarketingConsent,
  MARKETING_CONSENT_EVENT,
  setMarketingConsent,
} from "@/lib/analytics/marketing-consent";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(MARKETING_CONSENT_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(MARKETING_CONSENT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): boolean {
  return getStoredMarketingConsent() === null;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Bottom marketing-consent bar. Shown only until the visitor chooses.
 * Accept → GTM may load; Decline → stays off.
 */
export function MarketingConsentBanner() {
  const t = useTranslations("marketingConsent");
  const visible = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!visible) return null;

  return (
    <div
      className="marketing-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="marketing-consent-title"
      aria-describedby="marketing-consent-body"
    >
      <div className="marketing-consent-inner">
        <div className="marketing-consent-copy">
          <p id="marketing-consent-title" className="marketing-consent-title">
            {t("title")}
          </p>
          <p id="marketing-consent-body" className="marketing-consent-body">
            {t.rich("body", {
              privacy: (chunks) => (
                <Link href="/privacy" className="marketing-consent-link">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="marketing-consent-actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setMarketingConsent("denied")}
          >
            {t("decline")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setMarketingConsent("granted")}
          >
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
