import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import { typo } from "@/lib/typo";
import { getAll, getBySlug, getIndex } from "@/lib/catalog";
import { indexKgPairs, lineupFloorSizeMm, selectLineup } from "@/lib/catalog/lineup";
import { canUseLineupPhotos } from "@/lib/images/lineup-photos";

import { LineupMachineSlot } from "./LineupMachineSlot";
import { LineupMachineVisual } from "./LineupMachineVisual";
import { LineupRuler } from "./LineupRuler";

const LINEUP_TARGET_PX = 220;

export async function HomeHero() {
  const t = await getTranslations("home");
  const all = getAll();
  const lineup = selectLineup(all);
  const index = getIndex();
  const kgPairs = indexKgPairs(index);

  const floorSizes = lineup.map((m) =>
    lineupFloorSizeMm(m.dimensionsMm.w, m.dimensionsMm.d, m.dimensionsMm.h),
  );
  const maxH = Math.max(...floorSizes.map((s) => s.heightMm), 1);
  const scale = LINEUP_TARGET_PX / maxH;
  // Photos only when all 8 exist and look like straight front views (≤8% AR drift).
  const usePhotos = canUseLineupPhotos(lineup);

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
      >
        {lineup.map((m, i) => {
          const size = floorSizes[i]!;
          const product = getBySlug(m.slug);
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
