import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import { typo } from "@/lib/typo";
import { getAll, getIndex } from "@/lib/catalog/queries";
import {
  indexKgPairs,
  lineupFloorSizeMm,
  selectLineup,
  type RangeStripCandidate,
} from "@/lib/catalog/lineup";
import {
  buildCloudinaryUrl,
  getImagesCloudName,
  getModelImage,
  hasModelImage,
} from "@/lib/images";
import { canUseLineupPhotos } from "@/lib/images/lineup-photos";
import { formatIndexLoadKg } from "@/lib/catalog/format";

import { LineupMachineSlot } from "./LineupMachineSlot";
import { LineupMachineVisual } from "./LineupMachineVisual";
import { LineupRuler } from "./LineupRuler";

const LINEUP_TARGET_PX = 220;

export async function HomeHero() {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const all = await getAll();
  const hasPhoto = (slug: string) => hasModelImage(slug);
  const lineup = selectLineup(all, { hasPhoto });
  const index = await getIndex();
  const kgPairs = indexKgPairs(index);
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const cloudName = getImagesCloudName();

  const rangeStripCandidates: RangeStripCandidate[] = [];
  for (const product of all) {
    if (!product.loadKg || !hasPhoto(product.slug)) continue;
    const photo = getModelImage(product);
    const thumbnailSrc =
      photo?.publicId && cloudName
        ? buildCloudinaryUrl(cloudName, photo.publicId, 240, {
            extraTransforms: "e_trim",
          })
        : null;
    const keyStat = formatIndexLoadKg(product.loadKg, locale);
    rangeStripCandidates.push({
      slug: product.slug,
      name: product.name,
      category: product.category,
      loadMin: product.loadKg.min,
      loadMax: product.loadKg.max,
      keyStat,
      thumbnailSrc,
      thumbW: photo?.trimWidth ?? photo?.width ?? 120,
      thumbH: photo?.trimHeight ?? photo?.height ?? 150,
    });
  }

  const floorSizes = lineup.map((m) =>
    lineupFloorSizeMm(m.dimensionsMm.w, m.dimensionsMm.d, m.dimensionsMm.h),
  );
  const maxH = Math.max(...floorSizes.map((s) => s.heightMm), 1);
  const scale = LINEUP_TARGET_PX / maxH;
  const usePhotos = canUseLineupPhotos(lineup, hasPhoto);

  return (
    <section className="home-hero">
      <Container>
        <Grid>
          <div className="home-hero-copy">
            <h1>{typo(t("title"))}</h1>
            <p className="home-hero-sub">{typo(t("subtitle"))}</p>
            <div className="home-hero-actions">
              <Button href="/catalog" variant="secondary">
                {t("catalogCta")}
              </Button>
              <Button href="/quote" variant="primary">
                {t("quoteLink")}
              </Button>
            </div>
          </div>
        </Grid>
      </Container>

      <LineupRuler
        anchors={lineup.map((m) => m.kgMax)}
        kgPairs={kgPairs}
        totalCount={index.length}
        rangeStripCandidates={rangeStripCandidates}
      >
        {lineup.map((m, i) => {
          const size = floorSizes[i]!;
          const product = bySlug.get(m.slug);
          return (
            <LineupMachineSlot
              key={m.slug}
              kgMax={m.kgMax}
              index={i}
              caption={t("machineCaption", {
                kg: m.kgMax,
                w: m.dimensionsMm.w,
                d: m.dimensionsMm.d,
                h: m.dimensionsMm.h,
              })}
            >
              {product ? (
                <LineupMachineVisual
                  product={product}
                  floorWidthMm={size.widthMm}
                  floorHeightMm={size.heightMm}
                  scale={scale}
                  usePhotos={usePhotos}
                />
              ) : null}
            </LineupMachineSlot>
          );
        })}
      </LineupRuler>
    </section>
  );
}
