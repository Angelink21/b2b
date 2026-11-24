import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { siteConfig, visiblePhones } from "@/config/site";
import { getAll } from "@/lib/catalog/queries";
import { selectLineup } from "@/lib/catalog/lineup";
import { getSiteUrl } from "@/lib/seo/site-url";
import { OgSilhouette, OG_SIZE, ogColors } from "@/lib/seo/og";

export const alt = "Fagor Professional";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string }>;
};

const LOGO_DISPLAY_H = 36;

function hostLabel(): string {
  try {
    return new URL(getSiteUrl()).host.replace(/^www\./, "");
  } catch {
    return "pralne-obladnannya.com.ua";
  }
}

async function loadBrandLogoSrc(): Promise<string | null> {
  if (!siteConfig.logo.src.startsWith("/")) return null;
  try {
    const file = path.join(process.cwd(), "public", siteConfig.logo.src.slice(1));
    const bytes = await readFile(file);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "og" });
  const all = await getAll();
  const lineup = selectLineup(all).slice(0, 5);
  const withKg = all.filter((p) => p.loadKg);
  const kgMin = withKg.length
    ? Math.min(...withKg.map((p) => p.loadKg!.min))
    : null;
  const kgMax = withKg.length
    ? Math.max(...withKg.map((p) => p.loadKg!.max))
    : null;
  const nf = new Intl.NumberFormat(locale === "en" ? "en" : "uk");
  const host = hostLabel();
  const phone = visiblePhones()[0] ?? null;
  const logoSrc = await loadBrandLogoSrc();
  const logoW = Math.round(
    (siteConfig.logo.width / siteConfig.logo.height) * LOGO_DISPLAY_H,
  );

  const statBox = (label: string, value: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "14px 16px",
        border: `1px solid ${ogColors.line}`,
        backgroundColor: ogColors.surf,
        minWidth: 150,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: ogColors.steel,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 400,
          color: ogColors.ink,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: ogColors.bg,
          color: ogColors.ink,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `2px solid ${ogColors.line}`,
            paddingBottom: 16,
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori
              <img
                src={logoSrc}
                alt={siteConfig.name}
                width={logoW}
                height={LOGO_DISPLAY_H}
                style={{ display: "flex", height: LOGO_DISPLAY_H, width: logoW }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: ogColors.steel,
                }}
              >
                {siteConfig.name}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: ogColors.steel,
            }}
          >
            {t("eyebrow")}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 600,
              color: ogColors.ink,
              border: `1px solid ${ogColors.line}`,
              padding: "6px 12px",
            }}
          >
            {locale === "en" ? "EN" : "UA"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 36,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 16,
              maxWidth: 620,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 300,
                lineHeight: 1.2,
              }}
            >
              {t("headline")}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: ogColors.steel,
                lineHeight: 1.35,
              }}
            >
              {t("sub")}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 500,
                color: ogColors.ink,
                lineHeight: 1.35,
                marginTop: 4,
              }}
            >
              {t("partner")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 12,
              }}
            >
              {statBox(
                t("statLineup"),
                t("statLineupValue", { count: nf.format(all.length) }),
              )}
              {kgMin !== null && kgMax !== null
                ? statBox(
                    t("statLoad"),
                    t("statLoadValue", {
                      min: nf.format(kgMin),
                      max: nf.format(kgMax),
                    }),
                  )
                : null}
              {statBox(t("statService"), t("statServiceValue"))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              height: "100%",
              paddingBottom: 8,
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
                  maxPx={180}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${ogColors.line}`,
            marginTop: 24,
            paddingTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: ogColors.steel,
            }}
          >
            {`${host} · ${t("footerNote")}`}
          </div>
          {phone ? (
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 500,
                color: ogColors.ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {phone}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
