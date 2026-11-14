import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { routing } from "@/i18n/routing";
import { facets, getByCategory, getIndex } from "@/lib/catalog";
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

  const items = getIndex().filter((p) => p.category === category);
  const products = getByCategory(category);
  const f = facets(getIndex());
  const kgBounds = f.kg ?? { min: 8, max: 130 };
  const categoryLabel = tCat(category);

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
      <p className="catalog-lead mt-4 text-steel">
        {tCat(`intro.${category}`)}
      </p>
      <Suspense fallback={<p className="mt-8 text-steel">{t("loading")}</p>}>
        <div className="mt-8">
          <CatalogExplorer
            items={items}
            lockedCategory={category}
            kgBounds={kgBounds}
          />
        </div>
      </Suspense>
    </Container>
  );
}
