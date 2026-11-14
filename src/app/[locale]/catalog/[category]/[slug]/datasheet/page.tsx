import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ModelSpecs } from "@/components/catalog/ModelSpecs";
import { PrintButton } from "@/components/catalog/PrintButton";
import { Button } from "@/components/ui/Button";
import { DimensionDrawing } from "@/components/ui/DimensionDrawing";
import { routing } from "@/i18n/routing";
import { getAll, getBySlug } from "@/lib/catalog";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
  type CategorySlug,
} from "@/lib/catalog/schema";
import { buildSpecGroups } from "@/lib/catalog/spec-groups";

type PageProps = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function generateStaticParams() {
  const products = getAll();
  return routing.locales.flatMap((locale) =>
    products.map((product) => ({
      locale,
      category: product.category,
      slug: product.slug,
    })),
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, category, slug } = await params;
  const product = getBySlug(slug);
  if (!product || product.category !== category) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: `${product.name} · ${t("datasheetTitle")}`,
    description: `${product.name}. ${t("datasheetTitle")}`,
    robots: { index: false, follow: false },
  };
}

export default async function DatasheetPage({ params }: PageProps) {
  const { locale, category, slug } = await params;
  if (!isCategorySlug(category)) notFound();

  const product = getBySlug(slug);
  if (!product || product.category !== category) notFound();

  const t = await getTranslations({ locale, namespace: "model" });
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const tHeat = await getTranslations({ locale, namespace: "heating" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const heatingLabels: Partial<Record<string, string>> = {};
  for (const key of HEATING_KEYS) {
    heatingLabels[key] = tHeat(key);
  }
  const groups = buildSpecGroups(product, heatingLabels);
  const dims = product.dimensionsMm;

  return (
    <div className="datasheet-page">
      <div className="datasheet-toolbar no-print">
        <Button
          href={`/catalog/${product.category}/${product.slug}`}
          variant="link"
        >
          {product.name}
        </Button>
        <PrintButton />
      </div>

      <article className="datasheet-sheet">
        <header className="datasheet-header">
          <p className="datasheet-brand">{tNav("brand")}</p>
          <h1>{product.name}</h1>
          <p className="datasheet-meta text-steel">
            {t("datasheetHeading")} · {tCat(product.category)}
          </p>
        </header>

        <div className="datasheet-layout">
          <div className="datasheet-drawing">
            <DimensionDrawing
              widthMm={dims.w}
              heightMm={dims.h}
              targetMaxPx={280}
              title={product.name}
            />
          </div>
          <div className="datasheet-specs">
            <ModelSpecs
              groups={groups}
              groupLabels={{
                main: t("groups.main"),
                electrical: t("groups.electrical"),
                dimensions: t("groups.dimensions"),
              }}
              specLabels={{
                loadKg: t("specs.loadKg"),
                volumeL: t("specs.volumeL"),
                boilerL: t("specs.boilerL"),
                powerKw: t("specs.powerKw"),
                boilerPowerKw: t("specs.boilerPowerKw"),
                gFactor: t("specs.gFactor"),
                spinRpm: t("specs.spinRpm"),
                shaftDiameterMm: t("specs.shaftDiameterMm"),
                workingWidthMm: t("specs.workingWidthMm"),
                workingSpeedMpm: t("specs.workingSpeedMpm"),
                voltage: t("specs.voltage"),
                exhaustMm: t("specs.exhaustMm"),
                airflowM3h: t("specs.airflowM3h"),
                noiseDb: t("specs.noiseDb"),
                heating: t("specs.heating"),
                dimensionsMm: t("specs.dimensionsMm"),
              }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
