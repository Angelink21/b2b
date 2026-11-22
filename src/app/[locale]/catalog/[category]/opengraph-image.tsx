import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { getByCategory } from "@/lib/catalog/queries";
import {
  CATEGORY_SLUGS,
  type CategorySlug,
} from "@/lib/catalog/schema";
import { seoMessages } from "@/lib/seo/messages";
import { OgFrame, OgSilhouette, OG_SIZE, ogColors } from "@/lib/seo/og";

export const alt = "Fagor Professional";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string; category: string }>;
};

function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export default async function Image({ params }: Props) {
  const { locale, category } = await params;
  const messages = seoMessages(locale);

  const label = isCategorySlug(category)
    ? messages.categories[category]
    : category;
  const products = isCategorySlug(category)
    ? await getByCategory(category)
    : [];
  const sample = products[0];
  const description = messages.meta.categoryDescription.replace(
    "{category}",
    label,
  );

  return new ImageResponse(
    (
      <OgFrame brand={siteConfig.name}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 300,
              lineHeight: 1.15,
              maxWidth: 640,
            }}
          >
            {label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: ogColors.steel,
              maxWidth: 560,
              lineHeight: 1.35,
            }}
          >
            {description}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: ogColors.steel,
              marginTop: 8,
            }}
          >
            {String(products.length)}
          </div>
        </div>
        {sample ? (
          <OgSilhouette
            widthMm={sample.dimensionsMm.w}
            heightMm={sample.dimensionsMm.h}
            maxPx={300}
          />
        ) : null}
      </OgFrame>
    ),
    { ...size },
  );
}
