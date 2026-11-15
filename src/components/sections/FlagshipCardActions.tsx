"use client";

import { useLocale, useTranslations } from "next-intl";

import { CompareToggle } from "@/components/compare/CompareToggle";

type FlagshipCardActionsProps = {
  slug: string;
};

export function FlagshipCardActions({ slug }: FlagshipCardActionsProps) {
  const locale = useLocale();
  const t = useTranslations("home");

  return (
    <div className="flagship-card-actions">
      <CompareToggle slug={slug} size="sm" />
      <a
        className="btn btn-red btn-sm"
        href={`/${locale}/quote?m=${encodeURIComponent(slug)}`}
      >
        {t("flagshipQuote")}
      </a>
    </div>
  );
}
