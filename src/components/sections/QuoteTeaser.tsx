import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export async function QuoteTeaser() {
  const t = await getTranslations("quote");
  const tHome = await getTranslations("home");

  return (
    <section id="quote" className="quote-teaser">
      <Container className="quote-teaser-grid">
        <div>
          <h2>{t("title")}</h2>
          <p className="quote-teaser-sub">{t("subtitle")}</p>
        </div>
        <div className="quote-teaser-panel">
          <p className="text-steel">{t("stub")}</p>
          <div className="mt-4">
            <Button href="/quote" variant="primary">
              {tHome("quoteLink")}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
