import { getTranslations } from "next-intl/server";

import { Section } from "@/components/ui/Section";
import { typo } from "@/lib/typo";

const ADVANTAGE_KEYS = ["1", "2", "3", "4"] as const;

export async function AdvantagesSection() {
  const t = await getTranslations("home");

  return (
    <Section className="home-block">
      <h2 className="text-balance">{typo(t("advantagesHeading"))}</h2>
      <p className="home-block-lead text-pretty">
        {typo(t("advantagesLead"))}
      </p>
      <ul className="advantages-bento">
        {ADVANTAGE_KEYS.map((key) => (
          <li
            key={key}
            className={`advantages-card premium-frame advantages-card-${key}`}
          >
            <h3 className="text-balance">
              {typo(t(`advantage${key}Title`))}
            </h3>
            <p className="text-pretty">{typo(t(`advantage${key}Body`))}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
