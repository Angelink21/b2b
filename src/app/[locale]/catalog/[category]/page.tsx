import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { routing } from "@/i18n/routing";
import { facets, getIndex } from "@/lib/catalog";
import {
  CATEGORY_SLUGS,
  type CategorySlug,
} from "@/lib/catalog/schema";

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
  return {
    title: tCat(category),
    description: tMeta("catalogDescription"),
  };
}

export default async function CategoryCatalogPage({ params }: PageProps) {
  const { category } = await params;
  if (!isCategorySlug(category)) notFound();

  const t = await getTranslations("catalog");
  const tCat = await getTranslations("categories");
  const tCrumbs = await getTranslations("model");

  const items = getIndex().filter((p) => p.category === category);
  const f = facets(getIndex());
  const kgBounds = f.kg ?? { min: 8, max: 130 };

  return (
    <Container className="catalog-page py-12">
      <Breadcrumbs
        label={tCrumbs("breadcrumbs")}
        items={[
          { label: t("title"), href: "/catalog" },
          { label: tCat(category) },
        ]}
      />
      <h1 className="mt-6">{tCat(category)}</h1>
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
