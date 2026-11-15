import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { routing } from "@/i18n/routing";
import { getByCategory, getIndex } from "@/lib/catalog";
import {
  formatCategoryMetricLead,
  getCategorySummary,
} from "@/lib/catalog/category-summary";
import { getCategoryNavStats } from "@/lib/catalog/nav";
import {
  CATEGORY_SLUGS,
  type CategorySlug,
} from "@/lib/catalog/schema";
import {
  breadcrumbListJsonLd,
  itemListJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ locale: string; category: string }>;
};

function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    CATEGORY_SLUGS.map((category) => ({ locale, category })),
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, category } = await params;
  if (!isCategorySlug(category)) return {};
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const categoryLabel = tCat(category);
  return buildPageMetadata({
    locale,
    path: `/catalog/${category}`,
    title: categoryLabel,
    description: tMeta("categoryDescription", { category: categoryLabel }),
  });
}

export default async function CategoryCatalogPage({ params }: PageProps) {
  const { locale, category } = await params;
  if (!isCategorySlug(category)) notFound();

  const t = await getTranslations("catalog");
  const tCat = await getTranslations("categories");
  const tCrumbs = await getTranslations("model");
  const tUnits = await getTranslations("units");

  const items = getIndex().filter((p) => p.category === category);
  const products = getByCategory(category);
  const categoryLabel = tCat(category);
  const summary = getCategorySummary(category);
  const lead = formatCategoryMetricLead(
    summary,
    locale,
    {
      kg: tUnits("kg"),
      mm: tUnits("mm"),
      L: tUnits("L"),
      kW: tUnits("kW"),
    },
    {
      kg: t("metricLeadKg"),
      width: t("metricLeadWidth"),
      volume: t("metricLeadVolume"),
      power: t("metricLeadPower"),
    },
  );
  const categoryCounts = Object.fromEntries(
    getCategoryNavStats().map((stat) => [stat.slug, stat.count]),
  ) as Record<CategorySlug, number>;

  return (
    <Container className="catalog-page py-12">
      <JsonLd
        data={[
          breadcrumbListJsonLd(locale, [
            { name: t("title"), path: "/catalog" },
            { name: categoryLabel, path: `/catalog/${category}` },
          ]),
          itemListJsonLd(
            locale,
            categoryLabel,
            products.map((p) => ({
              name: p.name,
              path: `/catalog/${p.category}/${p.slug}`,
            })),
          ),
        ]}
      />
      <Breadcrumbs
        label={tCrumbs("breadcrumbs")}
        items={[
          { label: t("title"), href: "/catalog" },
          { label: categoryLabel },
        ]}
      />
      <h1 className="mt-6">{categoryLabel}</h1>
      {lead ? <p className="catalog-lead mt-6 text-steel">{lead}</p> : null}
      <div className="mt-6">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogExplorer
            items={items}
            lockedCategory={category}
            categoryCounts={categoryCounts}
          />
        </Suspense>
      </div>
    </Container>
  );
}
