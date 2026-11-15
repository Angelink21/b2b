import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { typo } from "@/lib/typo";

type PageKey = "about" | "service" | "contacts";

const META = {
  about: { title: "aboutTitle", description: "aboutDescription", path: "/about" },
  service: {
    title: "serviceTitle",
    description: "serviceDescription",
    path: "/service",
  },
  contacts: {
    title: "contactsTitle",
    description: "contactsDescription",
    path: "/contacts",
  },
} as const;

const BODY = {
  about: "aboutStub",
  service: "serviceStub",
  contacts: "contactsStub",
} as const;

export async function placeholderMetadata(locale: string, page: PageKey) {
  const t = await getTranslations({ locale, namespace: "meta" });
  const meta = META[page];
  return buildPageMetadata({
    locale,
    path: meta.path,
    title: t(meta.title),
    description: t(meta.description),
  });
}

export async function PlaceholderPage({ page }: { page: PageKey }) {
  const tNav = await getTranslations("nav");
  const t = await getTranslations("pages");

  return (
    <Container className="stub-page">
      <h1>{tNav(page)}</h1>
      <p>{typo(t(BODY[page]))}</p>
    </Container>
  );
}
