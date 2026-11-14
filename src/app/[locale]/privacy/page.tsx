import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { buildPageMetadata } from "@/lib/seo/metadata";

const SECTIONS = [
  "controller",
  "purposes",
  "categories",
  "retention",
  "rights",
  "contact",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    path: "/privacy",
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <Container className="privacy-page py-12">
      <h1>{t("title")}</h1>
      <p className="privacy-intro mt-4 text-steel">{t("intro")}</p>
      <div className="privacy-sections">
        {SECTIONS.map((key) => (
          <section key={key} className="privacy-section">
            <h2>{t(`${key}Title`)}</h2>
            <p className="text-steel">{t(`${key}Body`)}</p>
          </section>
        ))}
      </div>
    </Container>
  );
}
