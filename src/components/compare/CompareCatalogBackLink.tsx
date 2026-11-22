"use client";

import { useLocale } from "next-intl";
import { useSyncExternalStore } from "react";

import { readCatalogReturn } from "@/components/catalog/catalog-session";

function subscribeNoop(): () => void {
  return () => undefined;
}

type CompareCatalogBackLinkProps = {
  label: string;
};

/** Back-to-catalog link: last catalog URL with filters, else /catalog. */
export function CompareCatalogBackLink({ label }: CompareCatalogBackLinkProps) {
  const locale = useLocale();
  const path = useSyncExternalStore(
    subscribeNoop,
    () => {
      const saved = readCatalogReturn();
      if (!saved) return "/catalog";
      if (
        saved.pathname !== "/catalog" &&
        !/^\/catalog\/[^/]+$/.test(saved.pathname)
      ) {
        return "/catalog";
      }
      return `${saved.pathname}${saved.search}`;
    },
    () => "/catalog",
  );

  return (
    <p className="page-back-link mt-4">
      <a href={`/${locale}${path}`} className="btn btn-link btn-sm">
        {label}
      </a>
    </p>
  );
}
