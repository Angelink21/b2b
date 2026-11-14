"use client";

import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("nav");

  return (
    <a href="#main" className="skip-link">
      {t("skip")}
    </a>
  );
}
