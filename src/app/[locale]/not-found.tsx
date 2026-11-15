import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import { typo } from "@/lib/typo";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <Container className="not-found">
      <Grid>
        <div className="not-found-copy">
          <h1>{typo(t("notFoundTitle"))}</h1>
          <p>{typo(t("notFoundBody"))}</p>
          <Button href="/" variant="primary">
            {t("backHome")}
          </Button>
        </div>
      </Grid>
    </Container>
  );
}
