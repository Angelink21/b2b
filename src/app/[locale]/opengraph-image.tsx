import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { getAll } from "@/lib/catalog/queries";
import { selectLineup } from "@/lib/catalog/lineup";
import { seoMessages } from "@/lib/seo/messages";
import { OgFrame, OgSilhouette, OG_SIZE, ogColors } from "@/lib/seo/og";

export const alt = "Fagor Professional";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Image({ params }: Props) {
  const { locale } = await params;
  const meta = seoMessages(locale).meta;
  const lineup = selectLineup(await getAll()).slice(0, 5);

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
              fontSize: 52,
              fontWeight: 300,
              lineHeight: 1.15,
              maxWidth: 640,
            }}
          >
            {meta.homeTitle}
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
            {meta.homeDescription}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 320,
          }}
        >
          {lineup.map((m) => (
            <div
              key={m.slug}
              style={{ display: "flex", alignItems: "flex-end" }}
            >
              <OgSilhouette
                widthMm={m.dimensionsMm.w}
                heightMm={m.dimensionsMm.h}
                maxPx={200}
              />
            </div>
          ))}
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
