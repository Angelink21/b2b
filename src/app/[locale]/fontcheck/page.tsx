import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export async function generateMetadata() {
  return {
    robots: { index: false, follow: false },
  };
}

/** Glyph check for Spectral / Source Sans 3 — stage 1 verification. */
export default async function FontCheckPage() {
  const t = await getTranslations("fontcheck");
  const sample = t("sample");

  return (
    <Container className="py-12">
      <h1 className="font-serif font-light">{t("title")}</h1>
      <p className="mt-6 font-serif font-light text-[32px]">{sample}</p>
      <p className="mt-6 font-sans font-normal text-[32px]">{sample}</p>
      <p className="mt-6 font-sans font-medium text-[32px]">{sample}</p>
      <p className="mt-6 font-sans font-semibold text-[32px]">{sample}</p>
    </Container>
  );
}
