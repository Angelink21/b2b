import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CatalogReturnLink } from "@/components/catalog/CatalogReturnLink";
import { ModelActions } from "@/components/catalog/ModelActions";
import { ModelBreadcrumbs } from "@/components/catalog/ModelBreadcrumbs";
import { ModelFamilySwitcher } from "@/components/catalog/ModelFamilySwitcher";
import { ModelSpecs } from "@/components/catalog/ModelSpecs";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { DimHighlightProvider } from "@/components/motion/DimHighlight";
import { ModelSharedTransition } from "@/components/motion/ModelSharedTransition";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { ModelImage } from "@/components/ui/ModelImage";
import { Row, RowList } from "@/components/ui/Row";
import { Silhouette } from "@/components/ui/Silhouette";
import {
  GENERIC_SILHOUETTE_MM,
  getCategoryDef,
  hasRealDimensions,
} from "@/config/categories";
import { summarizeFamily } from "@/lib/catalog/family-diff";
import { formatLoadKg } from "@/lib/catalog/format";
import {
  getBySlug,
  getFamily,
  getRelated,
  getSeriesById,
} from "@/lib/catalog/queries";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
  type CategorySlug,
  type HeatingKey,
} from "@/lib/catalog/schema";
import { buildModelStaticParams } from "@/lib/catalog/static-params";
import { buildSpecGroups } from "@/lib/catalog/spec-groups";
import { getModelImage } from "@/lib/images";
import {
  breadcrumbListJsonLd,
  productJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildProductDescription } from "@/lib/seo/product-copy";

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
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const tHeat = await getTranslations({ locale, namespace: "heating" });
  const tUnits = await getTranslations({ locale, namespace: "units" });

  let heatingLabel: string | null = null;
  if (product.heating) {
    heatingLabel = tHeat(product.heating as HeatingKey);
  }

  return buildPageMetadata({
    locale,
    path: `/catalog/${product.category}/${product.slug}`,
    title: product.name,
    description: buildProductDescription(product, {
      category: tCat(product.category),
      heating: heatingLabel,
      units: {
        kg: tUnits("kg"),
        kW: tUnits("kW"),
        mm: tUnits("mm"),
        L: tUnits("L"),
        rpm: tUnits("rpm"),
        mpm: tUnits("mpm"),
        m3h: tUnits("m3h"),
        dB: tUnits("dB"),
      },
    }),
  });
}

export default async function ModelPage({ params }: PageProps) {
  const { locale, category, slug } = await params;
  if (!isCategorySlug(category)) notFound();

  const product = await getBySlug(slug);
  if (!product || product.category !== category) notFound();

  const t = await getTranslations({ locale, namespace: "model" });
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const tCatalog = await getTranslations({ locale, namespace: "catalog" });
  const tHeat = await getTranslations({ locale, namespace: "heating" });

  const series = await getSeriesById(product.seriesId);
  const family = await getFamily(product.familyId);
  const familyMembers = summarizeFamily(product, family);
  const related = await getRelated(product.slug, 4);

  const heatingLabels: Partial<Record<string, string>> = {};
  for (const key of HEATING_KEYS) {
    heatingLabels[key] = tHeat(key);
  }
  const groups = buildSpecGroups(product, heatingLabels);

  const photo = getModelImage(product);
  const dims = product.dimensionsMm;
  const realDims = hasRealDimensions(dims);
  const drawDims = realDims ? dims : GENERIC_SILHOUETTE_MM;
  const silhouetteKind =
    getCategoryDef(product.category)?.silhouette ?? "porthole";
  const descriptionBlocks = series?.fullBlocks ?? [];
  const hasDescription =
    descriptionBlocks.length > 0 || (series?.fullBullets.length ?? 0) > 0;

  let heatingLabel: string | null = null;
  if (product.heating) {
    heatingLabel = tHeat(product.heating as HeatingKey);
  }

  return (
    <Container className="model-page py-12">
      <JsonLd
        data={[
          breadcrumbListJsonLd(locale, [
            { name: tCatalog("title"), path: "/catalog" },
            {
              name: tCat(product.category),
              path: `/catalog/${product.category}`,
            },
            {
              name: product.name,
              path: `/catalog/${product.category}/${product.slug}`,
            },
          ]),
          productJsonLd(locale, product, {
            category: tCat(product.category),
            heating: heatingLabel,
            propertyNames: {
              loadKg: t("specs.loadKg"),
              powerKw: t("specs.powerKw"),
              dimensionsMm: t("specs.dimensionsMm"),
              heating: t("specs.heating"),
              volumeL: t("specs.volumeL"),
              workingWidthMm: t("specs.workingWidthMm"),
              spinRpm: t("specs.spinRpm"),
              gFactor: t("specs.gFactor"),
              voltage: t("specs.voltage"),
            },
          }),
        ]}
      />
      <ModelBreadcrumbs
        label={t("breadcrumbs")}
        catalogLabel={tCatalog("title")}
        catalogHref="/catalog"
        categoryLabel={tCat(product.category)}
        categoryHref={`/catalog/${product.category}`}
        modelName={product.name}
      />
      <CatalogReturnLink />

      <DimHighlightProvider>
      <div className="model-layout">
        <div className="model-visual">
          <ModelSharedTransition slug={`${product.slug}-visual`}>
            {photo ? (
              <ModelImage
                product={product}
                targetMaxPx={300}
                sizes="(max-width: 768px) 90vw, 300px"
                priority
                categoryLabel={tCat(product.category)}
              />
            ) : (
              <Silhouette
                widthMm={drawDims.w}
                heightMm={drawDims.h}
                targetMaxPx={300}
                title={product.name}
                variant={silhouetteKind}
              />
            )}
          </ModelSharedTransition>
        </div>

        <div className="model-main">
          <ModelSharedTransition slug={product.slug}>
            <h1>{product.name}</h1>
          </ModelSharedTransition>

          {series?.shortDescription ? (
            <p
              className="model-series text-steel"
              {...(locale === "en" ? { lang: "uk" } : {})}
            >
              {series.shortDescription}
              {locale === "en" ? (
                <span className="model-uk-note"> — {t("ukCopyNote")}</span>
              ) : null}
            </p>
          ) : null}

          <Suspense fallback={null}>
            <ModelActions
              slug={product.slug}
              category={product.category}
              locale={locale}
            />
          </Suspense>

          <div className="model-specs">
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

          <div className="model-family">
            <ModelFamilySwitcher
              heading={t("otherVariants")}
              members={familyMembers.map((member) => {
                const current = member.slug === product.slug;
                const label = member.variantLabel?.trim() || member.name;
                const fields = member.differingFields
                  .map((field) => {
                    switch (field) {
                      case "variantLabel":
                        return t("diffFields.variantLabel");
                      case "heating":
                        return t("diffFields.heating");
                      case "heatingVariant":
                        return t("diffFields.heatingVariant");
                      case "powerKw":
                        return t("diffFields.powerKw");
                      case "loadKg":
                        return t("diffFields.loadKg");
                      case "voltage":
                        return t("diffFields.voltage");
                      case "dimensionsMm":
                        return t("diffFields.dimensionsMm");
                      case "name":
                        return t("diffFields.name");
                      default:
                        return field;
                    }
                  })
                  .join(", ");
                return {
                  slug: member.slug,
                  category: member.category,
                  label,
                  current,
                  diffNote:
                    !current && fields.length > 0
                      ? t("differsIn", { fields })
                      : null,
                };
              })}
            />
          </div>

          {series && hasDescription ? (
            <section
              className="model-description"
              aria-labelledby="model-desc-heading"
            >
              <h2 id="model-desc-heading">{t("fullDescription")}</h2>
              {locale === "en" ? (
                <p className="model-uk-note mt-2">{t("ukCopyNote")}</p>
              ) : null}
              {descriptionBlocks.length > 0 ? (
                <div
                  className="model-desc-blocks"
                  {...(locale === "en" ? { lang: "uk" } : {})}
                >
                  {descriptionBlocks.map((block, index) =>
                    block.kind === "heading" ? (
                      <h3
                        key={`h-${index}-${block.text.slice(0, 24)}`}
                        className="model-desc-heading"
                      >
                        {block.text}
                      </h3>
                    ) : (
                      <p
                        key={`b-${index}-${block.text.slice(0, 24)}`}
                        className="model-desc-bullet"
                      >
                        {block.text}
                      </p>
                    ),
                  )}
                </div>
              ) : (
                <ul
                  className="model-bullets"
                  {...(locale === "en" ? { lang: "uk" } : {})}
                >
                  {series.fullBullets.map((bullet, index) => (
                    <li key={`${index}-${bullet.slice(0, 24)}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {related.length > 0 ? (
            <section
              className="model-related"
              aria-labelledby="model-related-heading"
            >
              <h2 id="model-related-heading">{t("related")}</h2>
              <RowList className="mt-6 model-related-list">
                {related.map((item) => {
                  const meta = item.loadKg
                    ? `${formatLoadKg(item.loadKg)} ${tCatalog("kg")}`
                    : undefined;
                  return (
                    <div key={item.slug} className="model-related-row">
                      <Row
                        href={`/catalog/${item.category}/${item.slug}`}
                        title={item.name}
                        body={tCat(item.category)}
                        {...(meta ? { meta } : {})}
                      />
                      <CompareToggle slug={item.slug} size="sm" />
                    </div>
                  );
                })}
              </RowList>
            </section>
          ) : null}
        </div>
      </div>
      </DimHighlightProvider>
    </Container>
  );
}
