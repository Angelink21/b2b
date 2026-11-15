import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CatalogReturnLink } from "@/components/catalog/CatalogReturnLink";
import { ModelActions } from "@/components/catalog/ModelActions";
import { ModelBreadcrumbs } from "@/components/catalog/ModelBreadcrumbs";
import { ModelFamilySwitcher } from "@/components/catalog/ModelFamilySwitcher";
import { ModelSpecs } from "@/components/catalog/ModelSpecs";
import { DimHighlightProvider } from "@/components/motion/DimHighlight";
import { ModelSharedTransition } from "@/components/motion/ModelSharedTransition";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { DimensionDrawing } from "@/components/ui/DimensionDrawing";
import { ModelImage } from "@/components/ui/ModelImage";
import { Row, RowList } from "@/components/ui/Row";
import { routing } from "@/i18n/routing";
import {
  getAll,
  getBySlug,
  getFamily,
  getRelated,
  getSeriesById,
} from "@/lib/catalog";
import { summarizeFamily } from "@/lib/catalog/family-diff";
import { formatLoadKg } from "@/lib/catalog/format";
import {
  CATEGORY_SLUGS,
  HEATING_KEYS,
  type CategorySlug,
  type HeatingKey,
} from "@/lib/catalog/schema";
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

  const product = getBySlug(slug);
  if (!product || product.category !== category) notFound();

  const t = await getTranslations({ locale, namespace: "model" });
  const tCat = await getTranslations({ locale, namespace: "categories" });
  const tCatalog = await getTranslations({ locale, namespace: "catalog" });
  const tHeat = await getTranslations({ locale, namespace: "heating" });

  const series = getSeriesById(product.seriesId);
  const family = getFamily(product.familyId);
  const familyMembers = summarizeFamily(product, family);
  const related = getRelated(product.slug, 4);

  const heatingLabels: Partial<Record<string, string>> = {};
  for (const key of HEATING_KEYS) {
    heatingLabels[key] = tHeat(key);
  }
  const groups = buildSpecGroups(product, heatingLabels);

  const photo = getModelImage(product);
  const dims = product.dimensionsMm;

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
              <DimensionDrawing
                widthMm={dims.w}
                heightMm={dims.h}
                targetMaxPx={300}
                title={product.name}
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
              currentSlug={product.slug}
              members={familyMembers}
              heading={t("otherVariants")}
              differsIn={(fields) => t("differsIn", { fields })}
              fieldLabels={{
                variantLabel: t("diffFields.variantLabel"),
                heating: t("diffFields.heating"),
                heatingVariant: t("diffFields.heatingVariant"),
                powerKw: t("diffFields.powerKw"),
                loadKg: t("diffFields.loadKg"),
                voltage: t("diffFields.voltage"),
                dimensionsMm: t("diffFields.dimensionsMm"),
                name: t("diffFields.name"),
              }}
            />
          </div>

          {series && series.fullBullets.length > 0 ? (
            <section
              className="model-description"
              aria-labelledby="model-desc-heading"
            >
              <h2 id="model-desc-heading">{t("fullDescription")}</h2>
              {locale === "en" ? (
                <p className="model-uk-note mt-2">{t("ukCopyNote")}</p>
              ) : null}
              <ul
                className="model-bullets"
                {...(locale === "en" ? { lang: "uk" } : {})}
              >
                {series.fullBullets.map((bullet, index) => (
                  <li key={`${index}-${bullet.slice(0, 24)}`}>{bullet}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section
              className="model-related"
              aria-labelledby="model-related-heading"
            >
              <h2 id="model-related-heading">{t("related")}</h2>
              <RowList className="mt-6">
                {related.map((item) => {
                  const meta = item.loadKg
                    ? `${formatLoadKg(item.loadKg)} ${tCatalog("kg")}`
                    : undefined;
                  return (
                    <Row
                      key={item.slug}
                      href={`/catalog/${item.category}/${item.slug}`}
                      title={item.name}
                      body={tCat(item.category)}
                      {...(meta ? { meta } : {})}
                    />
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
