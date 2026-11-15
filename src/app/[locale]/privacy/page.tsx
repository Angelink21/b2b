import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { typo } from "@/lib/typo";
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
    path: "/privacy",
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <Container className="privacy-page py-12">
      <h1>{typo(t("title"))}</h1>
      <p className="privacy-intro mt-6 text-steel">{typo(t("intro"))}</p>
      <section className="privacy-section">
        <h2>{typo(t("fieldsTitle"))}</h2>
        <p className="text-steel">{typo(t("fieldsBody"))}</p>
      </section>
      <section className="privacy-section">
        <h2>{typo(t("purposeTitle"))}</h2>
        <p className="text-steel">{typo(t("purposeBody"))}</p>
      </section>
    </Container>
  );
}
