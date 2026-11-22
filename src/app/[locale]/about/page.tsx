import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig, visibleContact } from "@/config/site";
import {
  aboutPageJsonLd,
  breadcrumbListJsonLd,
  organizationJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { typo } from "@/lib/typo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    path: "/about",
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getTranslations("about");
  const tNav = await getTranslations("nav");
  const address = visibleContact(siteConfig.address);

  const crumbs = [
    { label: tNav("brand"), href: "/" },
    { label: tNav("about") },
  ];

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          aboutPageJsonLd(locale),
          breadcrumbListJsonLd(locale, [
            { name: tNav("brand"), path: "" },
            { name: tNav("about"), path: "/about" },
          ]),
        ]}
      />
      <Container className="company-page py-12">
        <HistoryBackLink label={tNav("back")} />
        <Breadcrumbs items={crumbs} label={t("breadcrumbs")} />
        {locale === "en" && process.env.NODE_ENV !== "production" ? (
          <p className="company-review-note" role="note">
            {t("enReviewNote")}
          </p>
        ) : null}

        <header className="company-hero">
          <h1 className="text-balance">{typo(t("title"))}</h1>
          <p className="company-lead text-pretty">{typo(t("lead"))}</p>
        </header>

        <section className="company-block" aria-labelledby="about-history">
          <div className="about-prose">
            <h2 id="about-history" className="text-balance">
              {typo(t("historyHeading"))}
            </h2>
            <p className="text-pretty">{typo(t("historyBody"))}</p>
          </div>
        </section>

        <section className="company-block" aria-labelledby="about-expertise">
          <div className="about-prose">
            <h2 id="about-expertise" className="text-balance">
              {typo(t("expertiseHeading"))}
            </h2>
            <p className="text-pretty">{typo(t("expertiseBody"))}</p>
          </div>
        </section>

        <section className="company-block" aria-labelledby="about-infra">
          <div className="about-prose">
            <h2 id="about-infra" className="text-balance">
              {typo(t("infraHeading"))}
            </h2>
            <p className="text-pretty">{typo(t("infraBody"))}</p>
            {address ? (
              <p className="about-infra-address">
                <span className="about-infra-label">{t("infraAddressLabel")}</span>
                {address}
                {" · "}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t("mapLink")}
                </a>
              </p>
            ) : null}
          </div>
        </section>

        <section className="company-block" aria-labelledby="about-standards">
          <div className="about-prose">
            <h2 id="about-standards" className="text-balance">
              {typo(t("standardsHeading"))}
            </h2>
            <p className="text-pretty">{typo(t("standardsBody"))}</p>
            <div className="company-cta">
              <Button href="/service" variant="secondary">
                {t("standardsServiceLink")}
              </Button>
            </div>
          </div>
        </section>

        <section
          className="company-block about-cta-banner premium-frame"
          aria-labelledby="about-cta"
        >
          <h2 id="about-cta" className="text-balance">
            {typo(t("ctaBannerHeading"))}
          </h2>
          <p className="text-pretty">{typo(t("ctaBannerBody"))}</p>
          <div className="company-cta">
            <Button href="/quote" variant="primary">
              {t("cta")}
            </Button>
          </div>
        </section>
      </Container>
    </>
  );
}
