"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useSiteChrome } from "@/components/layout/SiteChromeContext";

const GlobalSearchDialog = dynamic(
  () =>
    import("./GlobalSearchDialog").then((mod) => mod.GlobalSearchDialog),
  { ssr: false },
);

export function GlobalSearchMount() {
  const { searchOpen } = useSiteChrome();
  const [loaded, setLoaded] = useState(false);

  // Keep the dialog chunk mounted after the first open (faster re-open).
  if (searchOpen && !loaded) {
    setLoaded(true);
  }

  if (!loaded) return null;

  return <GlobalSearchDialog />;
}
