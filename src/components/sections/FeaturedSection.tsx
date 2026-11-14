import { getTranslations } from "next-intl/server";

import { Row, RowList } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { FEATURED_SLUGS } from "@/config/featured";
import { getBySlug } from "@/lib/catalog";
import { typo } from "@/lib/typo";

export async function FeaturedSection() {
  const t = await getTranslations("home");
  const tCat = await getTranslations("catalog");
  const tCategories = await getTranslations("categories");
  const tHeating = await getTranslations("heating");

  const items = FEATURED_SLUGS.map((slug) => getBySlug(slug)).filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );

  if (items.length === 0) return null;

  return (
    <Section className="home-block">
      <h2>{typo(t("featuredHeading"))}</h2>
      <RowList className="rows-metrics">
        {items.map((product) => {
          const kgLabel = product.loadKg ? `${product.loadKg.raw} ${tCat("kg")}` : "—";
          const parts = [tCategories(product.category)];
          if (product.heating) {
            parts.push(tHeating(product.heating));
          }
          return (
            <Row
              key={product.slug}
              href="/catalog"
              title={product.name}
              body={parts.join(" · ")}
              meta={kgLabel}
            />
          );
        })}
      </RowList>
    </Section>
  );
}
