import { getTranslations } from "next-intl/server";

import { CasesSection } from "@/components/sections/CasesSection";
import { FeaturedSection } from "@/components/sections/FeaturedSection";
import { HomeHero } from "@/components/sections/HomeHero";
import { IndustriesSection } from "@/components/sections/IndustriesSection";
import { QuoteTeaser } from "@/components/sections/QuoteTeaser";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
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
    path: "",
    title: t("homeTitle"),
    description: t("homeDescription"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <OrganizationJsonLd locale={locale} />
      <HomeHero />
      <IndustriesSection />
      <FeaturedSection />
      <CasesSection />
      <QuoteTeaser />
    </>
  );
}
