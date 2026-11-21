import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";
import { Container } from "@/components/ui/Container";
import { getCategoryNavStats, getIndex } from "@/lib/catalog/queries";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/catalog/schema";
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
    path: "/catalog",
    title: t("catalogTitle"),
    description: t("catalogDescription"),
  });
}

export default async function CatalogPage() {
  const t = await getTranslations("catalog");
  const items = await getIndex();
  const stats = await getCategoryNavStats();
  const categoryCounts = Object.fromEntries(
    stats.map((stat) => [stat.slug, stat.count]),
  ) as Record<CategorySlug, number>;
  const categoryCount = CATEGORY_SLUGS.filter(
    (slug) => (categoryCounts[slug] ?? 0) > 0,
  ).length;

  return (
    <Container className="catalog-page py-12">
      <h1>{typo(t("title"))}</h1>
      <p className="catalog-lead text-steel mt-6">
        {typo(
          t("leadStats", {
            models: items.length,
            categories: categoryCount,
          }),
        )}
      </p>
      <div className="mt-6">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogExplorer items={items} categoryCounts={categoryCounts} />
        </Suspense>
      </div>
    </Container>
  );
}
