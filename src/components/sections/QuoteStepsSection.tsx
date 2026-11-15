import { getTranslations } from "next-intl/server";

import { Section } from "@/components/ui/Section";
import { typo } from "@/lib/typo";

const STEPS = ["1", "2", "3", "4"] as const;

export async function QuoteStepsSection() {
  const t = await getTranslations("home");

  return (
    <Section className="home-block">
      <h2 className="text-balance">{typo(t("stepsHeading"))}</h2>
      <ol className="process-steps">
        {STEPS.map((step) => (
          <li key={step} className="process-step premium-frame">
            <span className="process-step-index tabular-nums" aria-hidden="true">
              {String(step).padStart(2, "0")}
            </span>
            <h3 className="text-balance">{typo(t(`step${step}Title`))}</h3>
            <p className="text-pretty">{typo(t(`step${step}Body`))}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
