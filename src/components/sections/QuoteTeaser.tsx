import { QuoteFormSection } from "@/components/quote/QuoteFormSection";
import { Container } from "@/components/ui/Container";

export async function QuoteTeaser() {
  return (
    <section id="quote" className="quote-teaser">
      <Container>
        <QuoteFormSection idPrefix="home-quote" headingLevel="h2" />
      </Container>
    </section>
  );
}
