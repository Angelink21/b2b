import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { Section } from "@/components/ui/Section";
import { FEATURED_SLUGS } from "@/config/featured";
import { getBySlug } from "@/lib/catalog/queries";
import { typo } from "@/lib/typo";

import { FlagshipCardActions } from "./FlagshipCardActions";
import { FlagshipMedia } from "./FlagshipMedia";

export async function FlagshipSection() {
  const t = await getTranslations("home");
  const tCat = await getTranslations("catalog");
  const tCategories = await getTranslations("categories");

  const resolved = await Promise.all(
    FEATURED_SLUGS.map((slug) => getBySlug(slug)),
  );
  const items = resolved.filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );

  if (items.length === 0) return null;

  return (
    <Section className="home-block">
      <h2 className="text-balance">{typo(t("flagshipHeading"))}</h2>
      <p className="home-block-lead text-pretty">{typo(t("flagshipLead"))}</p>
      <ul className="flagship-grid">
        {items.map((product) => {
          const load =
            product.loadKg != null
              ? `${product.loadKg.raw}\u00A0${tCat("kg")}`
              : "—";
          const gFactor =
            product.gFactor != null ? String(product.gFactor) : null;

          return (
            <li key={product.slug} className="flagship-card premium-frame">
              <FlagshipMedia
                product={product}
                categoryLabel={tCategories(product.category)}
              />
              <h3 className="flagship-card-title text-balance">
                {product.name}
              </h3>
              <dl className="flagship-card-metrics">
                <div>
                  <dt>{t("flagshipLoad")}</dt>
                  <dd className="tabular-nums">{load}</dd>
                </div>
                {gFactor != null ? (
                  <div>
                    <dt>{tCat("colGFactor")}</dt>
                    <dd className="tabular-nums">{gFactor}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="flagship-card-badge">{t("flagshipBadge")}</p>
              <Suspense
                fallback={
                  <div className="flagship-card-actions" aria-hidden="true" />
                }
              >
                <FlagshipCardActions slug={product.slug} />
              </Suspense>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
