import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import { typo } from "@/lib/typo";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="site-footer">
      <Container>
        <Grid>
          <p className="site-footer-col">{typo(t("note"))}</p>
        </Grid>
      </Container>
    </footer>
  );
}
