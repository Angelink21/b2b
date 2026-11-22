import { ImageResponse } from "next/og";

import {
  GENERIC_SILHOUETTE_MM,
  hasRealDimensions,
} from "@/config/categories";
import { siteConfig } from "@/config/site";
import { getBySlug } from "@/lib/catalog/queries";
import { HEATING_KEYS, type HeatingKey } from "@/lib/catalog/schema";
import { getModelImage } from "@/lib/images";
import { seoMessages } from "@/lib/seo/messages";
import { OgFrame, OgSilhouette, OG_SIZE, ogColors } from "@/lib/seo/og";
import { buildProductOgSpecs } from "@/lib/seo/product-copy";

export const alt = "Fagor Professional";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

export default async function Image({ params }: Props) {
  const { locale, category, slug } = await params;
  const messages = seoMessages(locale);
  const product = await getBySlug(slug);

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

  const photo = getModelImage(product, {
    categoryLabel: messages.categories[product.category],
  });
  const ogPhotoH = photo
    ? Math.round((320 * photo.height) / Math.max(photo.width, 1))
    : 0;
  const visual = photo ? (
    // ImageResponse (Satori) cannot use next/image.
    // eslint-disable-next-line @next/next/no-img-element -- OG canvas
    <img
      src={photo.url}
      alt={photo.alt}
      width={320}
      height={ogPhotoH}
      style={{
        objectFit: "contain",
        width: 320,
        height: ogPhotoH,
      }}
    />
  ) : (
    <OgSilhouette
      widthMm={
        hasRealDimensions(product.dimensionsMm)
          ? product.dimensionsMm.w
          : GENERIC_SILHOUETTE_MM.w
      }
      heightMm={
        hasRealDimensions(product.dimensionsMm)
          ? product.dimensionsMm.h
          : GENERIC_SILHOUETTE_MM.h
      }
      maxPx={320}
    />
  );

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
        {visual}
      </OgFrame>
    ),
    { ...size },
  );
}
