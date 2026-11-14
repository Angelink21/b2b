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
    title: t("catalogTitle"),
    description: t("catalogDescription"),
  };
}

export default async function CatalogPage() {
  const t = await getTranslations("catalog");

  return (
    <Container className="py-12">
      <h1>{t("title")}</h1>
      <p className="mt-4 text-steel">{t("stub")}</p>
    </Container>
  );
}
