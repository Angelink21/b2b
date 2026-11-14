import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
  };
}

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <Container className="py-12">
      <h1>{t("title")}</h1>
      <p className="mt-4 max-w-[52ch] text-steel">{t("subtitle")}</p>
      <p className="mt-8 text-steel">{t("stub")}</p>
      <section id="industries" className="mt-24 scroll-mt-24">
        <h2>{t("industriesHeading")}</h2>
        <p className="mt-4 text-steel">{t("stub")}</p>
      </section>
    </Container>
  );
}
