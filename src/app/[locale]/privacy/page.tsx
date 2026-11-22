import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { siteConfig, visiblePhones } from "@/config/site";
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

const SECTIONS = [
  "controller",
  "fields",
  "purpose",
  "legal",
  "processors",
  "retention",
  "rights",
  "cookies",
  "updates",
] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const phones = visiblePhones().join(", ");
  const vars = {
    name: siteConfig.name,
    email: siteConfig.email,
    phones,
    address: siteConfig.address,
  };

  return (
    <Container className="privacy-page py-12">
      <h1>{typo(t("title"))}</h1>
      <p className="privacy-intro mt-6 text-steel">{typo(t("intro"))}</p>
      <div className="privacy-sections">
        {SECTIONS.map((id) => (
          <section key={id} className="privacy-section">
            <h2>{typo(t(`${id}Title`))}</h2>
            <p className="text-steel">{typo(t(`${id}Body`, vars))}</p>
          </section>
        ))}
      </div>
    </Container>
  );
}
