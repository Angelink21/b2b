import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { getEnv } from "@/env";
import { getAll } from "@/lib/catalog";
import { SECTOR_KEYS } from "@/lib/catalog/schema";

import { QuoteForm, QuoteFormFallback, type SectorOption } from "./QuoteForm";

type QuoteFormSectionProps = {
  idPrefix?: string;
  headingLevel?: "h1" | "h2";
  showIntro?: boolean;
};

export async function QuoteFormSection({
  idPrefix = "quote",
  headingLevel = "h2",
  showIntro = true,
}: QuoteFormSectionProps) {
  const t = await getTranslations("quote");
  const ti = await getTranslations("industries");
  const env = getEnv();

  const modelCatalog = getAll().map((product) => ({
    slug: product.slug,
    name: product.name,
  }));

  const sectors: SectorOption[] = SECTOR_KEYS.map((key) => ({
    value: key,
    label: ti(`${key}.title`),
  }));

  const Heading = headingLevel;

  return (
    <div className="quote-section-inner">
      {showIntro ? (
        <div className="quote-section-copy">
          <Heading>{t("title")}</Heading>
          <p className="quote-teaser-sub">{t("subtitle")}</p>
        </div>
      ) : null}
      <div className="quote-teaser-panel">
        <Suspense fallback={<QuoteFormFallback />}>
          <QuoteForm
            modelCatalog={modelCatalog}
            sectors={sectors}
            turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
            idPrefix={idPrefix}
          />
        </Suspense>
      </div>
    </div>
  );
}
