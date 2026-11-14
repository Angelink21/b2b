import { getTranslations } from "next-intl/server";

import { Section } from "@/components/ui/Section";
import { listCases } from "@/lib/content/cases";

export async function CasesSection() {
  const cases = listCases();
  if (cases.length === 0) return null;

  const t = await getTranslations("home");

  return (
    <Section className="home-block">
      <h2>{t("casesHeading")}</h2>
      <ul>
        {cases.map((entry) => (
          <li key={entry.slug}>{entry.title}</li>
        ))}
      </ul>
    </Section>
  );
}
