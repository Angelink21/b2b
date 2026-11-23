import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CompareCatalogBackLink } from "@/components/compare/CompareCatalogBackLink";
import { CompareView } from "@/components/compare/CompareView";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getAll } from "@/lib/catalog/queries";
import { buildCompareRecords } from "@/lib/catalog/compare";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
} from "@/lib/catalog/schema";
import type { SpecFieldKey } from "@/lib/catalog/spec-groups";
import { getModelImage } from "@/lib/images";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  hasIndexBlockingParams,
  NOINDEX_FOLLOW,
} from "@/lib/seo/robots-policy";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    path: "/compare",
    title: t("compareTitle"),
    description: t("compareDescription"),
    robots: hasIndexBlockingParams(query) ? NOINDEX_FOLLOW : undefined,
  });
}

export default async function ComparePage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  const tModel = await getTranslations({ locale, namespace: "model" });
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const tHeat = await getTranslations({ locale, namespace: "heating" });
  const tCatalog = await getTranslations({ locale, namespace: "catalog" });

  const heatingLabels: Partial<Record<string, string>> = {};
  for (const key of HEATING_KEYS) {
    heatingLabels[key] = tHeat(key);
  }

  const specLabels = {
    loadKg: tModel("specs.loadKg"),
    volumeL: tModel("specs.volumeL"),
    boilerL: tModel("specs.boilerL"),
    powerKw: tModel("specs.powerKw"),
    boilerPowerKw: tModel("specs.boilerPowerKw"),
    gFactor: tModel("specs.gFactor"),
    spinRpm: tModel("specs.spinRpm"),
    shaftDiameterMm: tModel("specs.shaftDiameterMm"),
    workingWidthMm: tModel("specs.workingWidthMm"),
    workingSpeedMpm: tModel("specs.workingSpeedMpm"),
    voltage: tModel("specs.voltage"),
    exhaustMm: tModel("specs.exhaustMm"),
    airflowM3h: tModel("specs.airflowM3h"),
    noiseDb: tModel("specs.noiseDb"),
    heating: tModel("specs.heating"),
    dimensionsMm: tModel("specs.dimensionsMm"),
  } satisfies Record<SpecFieldKey, string>;

  const categoryLabels: Record<string, string> = {};
  for (const slug of CATEGORY_SLUGS) {
    categoryLabels[slug] = tCat(slug);
  }

  const products = await getAll();
  const photos = new Map(
    await Promise.all(
      products.map(async (product) => {
        const categoryLabel = categoryLabels[product.category];
        const photo =
          categoryLabel !== undefined
            ? await getModelImage(product, { categoryLabel })
            : await getModelImage(product);
        if (!photo) return [product.slug, null] as const;
        return [
          product.slug,
          {
            loaderSrc: photo.loaderSrc,
            alt: photo.alt,
            width: photo.width,
            height: photo.height,
          },
        ] as const;
      }),
    ),
  );
  const records = buildCompareRecords(products, photos);

  const crumbs = [
    { label: tCatalog("title"), href: "/catalog" },
    { label: t("title") },
  ];

  return (
    <Container className="compare-page py-12">
      <CompareCatalogBackLink label={t("toCatalog")} />
      <Breadcrumbs items={crumbs} label={t("breadcrumbs")} />
      <h1>{t("title")}</h1>
      <Suspense fallback={<p className="mt-6 text-steel">{t("loading")}</p>}>
        <div className="mt-6">
          <CompareView
            records={records}
            heatingLabels={heatingLabels}
            specLabels={specLabels}
            categoryLabels={categoryLabels}
          />
        </div>
      </Suspense>
    </Container>
  );
}
