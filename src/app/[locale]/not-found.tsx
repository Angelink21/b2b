import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <Container className="py-24">
      <h1>{t("notFoundTitle")}</h1>
      <p className="mt-4 text-steel">{t("notFoundBody")}</p>
      <p className="mt-8">
        <Link href="/" className="btn btn-red">
          {t("backHome")}
        </Link>
      </p>
    </Container>
  );
}
