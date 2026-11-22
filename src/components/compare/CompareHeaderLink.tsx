"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { serializeCompareSlugs } from "@/lib/catalog/compare";

import { useCompareContext } from "./CompareProvider";

function CompareGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="6" width="4" height="10" fill="currentColor" />
      <rect x="12" y="3" width="4" height="13" fill="currentColor" />
    </svg>
  );
}

export function CompareHeaderLink() {
  const t = useTranslations("compare");
  const { selected, ready } = useCompareContext();
  const count = selected.length;

  if (!ready || count === 0) return null;

  const href = `/compare?m=${encodeURIComponent(serializeCompareSlugs(selected))}`;

  return (
    <Link
      href={href}
      className="header-compare header-tool"
      aria-label={t("headerAria", { count })}
    >
      <CompareGlyph />
      <span className="header-compare-count" aria-hidden="true">
        {count}
      </span>
    </Link>
  );
}
