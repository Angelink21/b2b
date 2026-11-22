import { getTranslations } from "next-intl/server";

import { QuoteFormSection } from "@/components/quote/QuoteFormSection";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  hasIndexBlockingParams,
  NOINDEX_FOLLOW,
} from "@/lib/seo/robots-policy";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    path: "/quote",
    title: t("quoteTitle"),
    description: t("quoteDescription"),
    robots: hasIndexBlockingParams(query) ? NOINDEX_FOLLOW : undefined,
  });
}

export default async function QuotePage() {
  const t = await getTranslations("quote");
  const tNav = await getTranslations("nav");

  const crumbs = [
    { label: tNav("brand"), href: "/" },
    { label: tNav("quote") },
  ];

  return (
    <section className="bg-floor py-12">
      <Container>
        <HistoryBackLink label={tNav("back")} />
        <Breadcrumbs items={crumbs} label={t("breadcrumbs")} />
        <QuoteFormSection idPrefix="page-quote" headingLevel="h1" />
      </Container>
    </section>
  );
}
