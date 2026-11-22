import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ModelSpecs } from "@/components/catalog/ModelSpecs";
import { PrintButton } from "@/components/catalog/PrintButton";
import { Button } from "@/components/ui/Button";
import { DimensionDrawing } from "@/components/ui/DimensionDrawing";
import { Silhouette } from "@/components/ui/Silhouette";
import {
  GENERIC_SILHOUETTE_MM,
  getCategoryDef,
  hasRealDimensions,
} from "@/config/categories";
import { getBySlug } from "@/lib/catalog/queries";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
  type CategorySlug,
} from "@/lib/catalog/schema";
import { buildModelStaticParams } from "@/lib/catalog/static-params";
import { buildSpecGroups } from "@/lib/catalog/spec-groups";

type PageProps = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

/** Snapshot only — do not call runtime `getCatalog()` here. */
export function generateStaticParams() {
  return buildModelStaticParams();
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, category, slug } = await params;
  const product = await getBySlug(slug);
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

  const product = await getBySlug(slug);
  if (!product || product.category !== category) notFound();

  const t = await getTranslations({ locale, namespace: "model" });
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const tHeat = await getTranslations({ locale, namespace: "heating" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const heatingLabels: Partial<Record<string, string>> = {};
  for (const key of HEATING_KEYS) {
    heatingLabels[key] = tHeat(key);
  }
  const groups = buildSpecGroups(product, heatingLabels, locale);
  const dims = product.dimensionsMm;
  const realDims = hasRealDimensions(dims);
  const drawDims = realDims ? dims : GENERIC_SILHOUETTE_MM;
  const silhouetteKind =
    getCategoryDef(product.category)?.silhouette ?? "porthole";

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
            {realDims ? (
              <DimensionDrawing
                widthMm={dims.w}
                heightMm={dims.h}
                targetMaxPx={280}
                title={product.name}
              />
            ) : (
              <Silhouette
                widthMm={drawDims.w}
                heightMm={drawDims.h}
                targetMaxPx={280}
                title={product.name}
                variant={silhouetteKind}
              />
            )}
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
