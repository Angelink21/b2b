"use client";

import { useTranslations } from "next-intl";

import { CompareToggle } from "@/components/compare/CompareToggle";
import { Button } from "@/components/ui/Button";

type ModelActionsProps = {
  slug: string;
  category: string;
  locale: string;
};

export function ModelActions({ slug, category, locale }: ModelActionsProps) {
  const tQuote = useTranslations("quote");
  const tModel = useTranslations("model");

  return (
    <div className="model-cta mt-8">
      <a
        className="btn btn-red"
        href={`/${locale}/quote?m=${encodeURIComponent(slug)}`}
      >
        {tQuote("quoteThisModel")}
      </a>
      <CompareToggle slug={slug} size="md" />
      <Button
        href={`/catalog/${category}/${slug}/datasheet`}
        variant="link"
        size="md"
      >
        {tModel("datasheet")}
      </Button>
    </div>
  );
}
