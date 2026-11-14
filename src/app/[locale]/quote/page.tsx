import { getTranslations } from "next-intl/server";

import { QuoteFormSection } from "@/components/quote/QuoteFormSection";
import { Container } from "@/components/ui/Container";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    path: "/quote",
    title: t("quoteTitle"),
    description: t("quoteDescription"),
  });
}

export default async function QuotePage() {
  return (
    <section className="bg-floor py-12">
      <Container>
        <QuoteFormSection idPrefix="page-quote" headingLevel="h1" />
      </Container>
    </section>
  );
}
