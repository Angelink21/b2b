"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

import {
  getMarketingConsent,
  MARKETING_CONSENT_EVENT,
} from "@/lib/analytics/marketing-consent";

type GoogleTagManagerProps = {
  gtmId: string;
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener(MARKETING_CONSENT_EVENT, onStoreChange);
  return () => window.removeEventListener(MARKETING_CONSENT_EVENT, onStoreChange);
}

function getConsentSnapshot() {
  return getMarketingConsent() === "granted";
}

function getServerConsentSnapshot() {
  return false;
}

/**
 * Loads GTM only when marketing consent is granted (banner Accept).
 */
export function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  const allowed = useSyncExternalStore(
    subscribe,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  if (!allowed || !gtmId) return null;

  return (
    <>
      <Script id="fagor-gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height={0}
          width={0}
          title="Google Tag Manager"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
