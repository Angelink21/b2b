"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { readCatalogReturn } from "./catalog-session";

function subscribeNoop(): () => void {
  return () => undefined;
}

/**
 * Client-only “back to results” after the main breadcrumbs.
 * Uses a plain <a> so filter query strings stay valid (next-intl Link pathnames are query-free).
 */
export function CatalogReturnLink() {
  const t = useTranslations("model");
  const locale = useLocale();
  const path = useSyncExternalStore(
    subscribeNoop,
    () => {
      const saved = readCatalogReturn();
      if (!saved) return null;
      if (
        saved.pathname !== "/catalog" &&
        !/^\/catalog\/[^/]+$/.test(saved.pathname)
      ) {
        return null;
      }
      return `${saved.pathname}${saved.search}`;
    },
    () => null,
  );

  if (!path) return null;

  return (
    <p className="model-return mt-4">
      <a href={`/${locale}${path}`} className="btn btn-link btn-sm">
        {t("backToResults")}
      </a>
    </p>
  );
}
