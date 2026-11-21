import { getTranslations } from "next-intl/server";

import { Section } from "@/components/ui/Section";
import { listCaseIds } from "@/lib/content/cases";
import { typo } from "@/lib/typo";

export async function CasesSection() {
  const caseIds = listCaseIds();
  if (caseIds.length === 0) return null;

  const t = await getTranslations("home");

  return (
    <Section className="home-block">
      <h2 className="text-balance">{typo(t("casesHeading"))}</h2>
      <p className="home-block-lead text-pretty">{typo(t("casesLead"))}</p>
      <ul className="cases-list">
        {caseIds.map((id) => (
          <li key={id} className="cases-row">
            <h3 className="text-balance">{typo(t(`cases.${id}.title`))}</h3>
            <p className="text-pretty">{typo(t(`cases.${id}.body`))}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
