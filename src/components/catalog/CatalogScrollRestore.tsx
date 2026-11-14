"use client";

import { useEffect } from "react";

import { consumeCatalogScroll } from "./catalog-session";

/** Restores catalog scroll position after returning from a model page. */
export function CatalogScrollRestore() {
  useEffect(() => {
    const y = consumeCatalogScroll();
    if (y == null || y <= 0) return;
    const id = window.requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return null;
}
