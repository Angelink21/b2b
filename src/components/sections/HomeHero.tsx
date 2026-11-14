import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { Silhouette } from "@/components/ui/Silhouette";
import { typo } from "@/lib/typo";
import { getAll, getIndex } from "@/lib/catalog";
import { indexKgPairs, selectLineup } from "@/lib/catalog/lineup";

import { LineupMachineSlot } from "./LineupMachineSlot";
import { LineupRuler } from "./LineupRuler";

const LINEUP_TARGET_PX = 190;

export async function HomeHero() {
  const t = await getTranslations("home");
  const lineup = selectLineup(getAll());
  const index = getIndex();
  const kgPairs = indexKgPairs(index);

  const maxH = Math.max(...lineup.map((m) => m.dimensionsMm.h), 1);
  const scale = LINEUP_TARGET_PX / maxH;

  return (
    <section className="home-hero">
      <Container className="home-hero-copy">
        <h1>{typo(t("title"))}</h1>
        <p className="home-hero-sub">{typo(t("subtitle"))}</p>
      </Container>

      <LineupRuler
        anchors={lineup.map((m) => m.kgMax)}
        kgPairs={kgPairs}
        totalCount={index.length}
      >
        {lineup.map((m, i) => (
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
            <Silhouette
              widthMm={m.dimensionsMm.w}
              heightMm={m.dimensionsMm.h}
              scale={scale}
            />
          </LineupMachineSlot>
        ))}
      </LineupRuler>
    </section>
  );
}
