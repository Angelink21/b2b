import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { getBySlug } from "@/lib/catalog";
import { HEATING_KEYS, type HeatingKey } from "@/lib/catalog/schema";
import { seoMessages } from "@/lib/seo/messages";
import { OgFrame, OgSilhouette, OG_SIZE, ogColors } from "@/lib/seo/og";
import { buildProductOgSpecs } from "@/lib/seo/product-copy";

export const alt = "Fagor Industrial";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

export default async function Image({ params }: Props) {
  const { locale, category, slug } = await params;
  const messages = seoMessages(locale);
  const product = getBySlug(slug);

  if (!product || product.category !== category) {
    return new ImageResponse(
      (
        <OgFrame brand={siteConfig.name}>
          <div style={{ display: "flex", fontSize: 48 }}>{siteConfig.name}</div>
        </OgFrame>
      ),
      { ...size },
    );
  }

  let heatingLabel: string | null = null;
  if (
    product.heating &&
    (HEATING_KEYS as readonly string[]).includes(product.heating)
  ) {
    heatingLabel = messages.heating[product.heating as HeatingKey];
  }

  const specs = buildProductOgSpecs(product, {
    category: messages.categories[product.category],
    heating: heatingLabel,
    units: messages.units,
  });

  return new ImageResponse(
    (
      <OgFrame brand={siteConfig.name}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: ogColors.steel,
            }}
          >
            {messages.categories[product.category]}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 300,
              lineHeight: 1.15,
              maxWidth: 640,
            }}
          >
            {product.name}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 8,
            }}
          >
            {specs.map((line) => (
              <div
                key={line}
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: ogColors.steel,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
        <OgSilhouette
          widthMm={product.dimensionsMm.w}
          heightMm={product.dimensionsMm.h}
          maxPx={320}
        />
      </OgFrame>
    ),
    { ...size },
  );
}
