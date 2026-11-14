import { getTranslations } from "next-intl/server";

import { Row, RowList } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { SECTOR_KEYS } from "@/lib/catalog/schema";
import { typo } from "@/lib/typo";

const INDUSTRY_ORDER = [
  "hospitality",
  "hospitals",
  "laundries",
  "social",
  "industrial",
] as const satisfies ReadonlyArray<(typeof SECTOR_KEYS)[number]>;

export async function IndustriesSection() {
  const t = await getTranslations("home");
  const ti = await getTranslations("industries");

  return (
    <Section id="industries" className="home-block">
      <h2>{typo(t("industriesHeading"))}</h2>
      <RowList className="rows-split">
        {INDUSTRY_ORDER.map((key) => (
          <Row
            key={key}
            href={`/quote?sector=${key}`}
            title={ti(`${key}.title`)}
            body={ti(`${key}.body`)}
          />
        ))}
      </RowList>
    </Section>
  );
}
