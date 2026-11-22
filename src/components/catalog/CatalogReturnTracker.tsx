"use client";

import { useEffect } from "react";

import { saveCatalogReturn } from "./catalog-session";

type CatalogReturnTrackerProps = {
  pathname: string;
  search: string;
};

/** Persist the last catalog URL (with filters) when leaving /catalog. */
export function CatalogReturnTracker({
  pathname,
  search,
}: CatalogReturnTrackerProps) {
  useEffect(() => {
    saveCatalogReturn({
      pathname,
      search,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    });
    return () => {
      saveCatalogReturn({
        pathname,
        search,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      });
    };
  }, [pathname, search]);

  return null;
}
