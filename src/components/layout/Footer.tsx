import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-line py-6 text-[15px] text-steel">
      <Container>{t("note")}</Container>
    </footer>
  );
}
