import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { Container } from "@/components/ui/Container";
import { facets, getIndex } from "@/lib/catalog";

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
  const items = getIndex();
  const f = facets(items);
  const kgBounds = f.kg ?? { min: 8, max: 130 };

  return (
    <Container className="catalog-page py-12">
      <h1>{t("title")}</h1>
      <p className="catalog-lead mt-4 text-steel">{t("lead")}</p>
      <Suspense fallback={<p className="mt-8 text-steel">{t("loading")}</p>}>
        <div className="mt-8">
          <CatalogExplorer items={items} kgBounds={kgBounds} />
        </div>
      </Suspense>
    </Container>
  );
}
