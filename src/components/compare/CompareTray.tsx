"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { serializeCompareSlugs } from "@/lib/catalog/compare";
import type { CategorySlug } from "@/lib/catalog/schema";

import { useCompareSelection } from "./useCompareSelection";

export type CompareTrayItem = {
  slug: string;
  name: string;
  category: CategorySlug;
};

type CompareTrayProps = {
  itemsBySlug: Record<string, CompareTrayItem>;
};

export function CompareTray({ itemsBySlug }: CompareTrayProps) {
  const t = useTranslations("compare");
  const { selected, remove, clear } = useCompareSelection();

  const resolved = selected
    .map((slug) => itemsBySlug[slug])
    .filter((item): item is CompareTrayItem => Boolean(item));

  const visible = resolved.length > 0;

  useEffect(() => {
    document.body.classList.toggle("has-compare-tray", visible);
    return () => {
      document.body.classList.remove("has-compare-tray");
    };
  }, [visible]);

  if (!visible) return null;

  const compareHref = `/compare?m=${encodeURIComponent(serializeCompareSlugs(resolved.map((i) => i.slug)))}`;

  return (
    <div className="compare-tray" role="region" aria-label={t("trayLabel")}>
      <div className="compare-tray-inner">
        <p className="compare-tray-count">
          {t("selected", { count: resolved.length })}
        </p>
        <ul className="compare-tray-list">
          {resolved.map((item) => (
            <li key={item.slug}>
              <span className="compare-tray-name">{item.name}</span>
              <button
                type="button"
                className="compare-tray-remove"
                aria-label={t("remove", { name: item.name })}
                onClick={() => {
                  void remove(item.slug);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="compare-tray-actions">
          <Button href={compareHref} variant="secondary" size="sm">
            {t("openCompare")}
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              void clear();
            }}
          >
            {t("clear")}
          </Button>
        </div>
      </div>
    </div>
  );
}
