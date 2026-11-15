import { getTranslations } from "next-intl/server";

import { AdvantagesSection } from "@/components/sections/AdvantagesSection";
import { CasesSection } from "@/components/sections/CasesSection";
import { FlagshipSection } from "@/components/sections/FlagshipSection";
import { HomeHero } from "@/components/sections/HomeHero";
import { IndustriesSection } from "@/components/sections/IndustriesSection";
import { QuoteStepsSection } from "@/components/sections/QuoteStepsSection";
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
      <FlagshipSection />
      <AdvantagesSection />
      <CasesSection />
      <QuoteStepsSection />
      <QuoteTeaser />
    </>
  );
}
