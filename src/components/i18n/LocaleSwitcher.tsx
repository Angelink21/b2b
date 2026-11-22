"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LABEL: Record<AppLocale, string> = {
  uk: "UA",
  en: "EN",
};

function subscribeHash(onStoreChange: () => void): () => void {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHashSnapshot(): string {
  return window.location.hash.replace(/^#/, "");
}

function getServerHashSnapshot(): string {
  return "";
}

function LocaleSwitcherLinks({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = useSyncExternalStore(
    subscribeHash,
    getHashSnapshot,
    getServerHashSnapshot,
  );

  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`locale-switch ${className}`.trim()}
    >
      {routing.locales.map((code, index) => {
        const current = code === locale;
        return (
          <span key={code} className="locale-switch-item">
            {index > 0 ? (
              <span className="locale-sep" aria-hidden="true">
                |
              </span>
            ) : null}
            <Link
              href={{
                pathname,
                query,
                hash: hash || undefined,
              }}
              locale={code}
              hrefLang={code}
              lang={code}
              aria-current={current ? "page" : undefined}
            >
              {LABEL[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

function LocaleSwitcherFallback({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`locale-switch ${className}`.trim()}
    >
      {routing.locales.map((code, index) => {
        const current = code === locale;
        return (
          <span key={code} className="locale-switch-item">
            {index > 0 ? (
              <span className="locale-sep" aria-hidden="true">
                |
              </span>
            ) : null}
            <Link
              href={pathname}
              locale={code}
              hrefLang={code}
              lang={code}
              aria-current={current ? "page" : undefined}
            >
              {LABEL[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

/** Keeps query + hash when switching locale; Suspense for useSearchParams. */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  return (
    <Suspense fallback={<LocaleSwitcherFallback className={className} />}>
      <LocaleSwitcherLinks className={className} />
    </Suspense>
  );
}
