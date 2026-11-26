import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { ServiceRequestForm } from "@/components/service/ServiceRequestForm";
import { QuoteFormFallback } from "@/components/quote/QuoteForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import {
  localizedAddress,
  localizedHours,
  mapsHref,
  siteConfig,
  telHref,
  visibleContact,
  visiblePhones,
} from "@/config/site";
import { getEnv } from "@/env";
import { breadcrumbListJsonLd, organizationJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { typo } from "@/lib/typo";

const PROCESS_STEPS = ["1", "2", "3", "4"] as const;
const FAQ_ITEMS = ["1", "2", "3"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    path: "/service",
    title: t("serviceTitle"),
    description: t("serviceDescription"),
  });
}

export default async function ServicePage() {
  const locale = await getLocale();
  const t = await getTranslations("service");
  const tNav = await getTranslations("nav");
  const env = getEnv();

  const phones = visiblePhones();
  const email = visibleContact(siteConfig.email);
  const address = localizedAddress(locale);
  const mapUrl = mapsHref(address ?? undefined);
  const hours = localizedHours(locale);
  const hasDirectContacts = Boolean(phones.length > 0 || email || hours);

  const crumbs = [
    { label: tNav("brand"), href: "/" },
    { label: tNav("service") },
  ];

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(locale),
          breadcrumbListJsonLd(locale, [
            { name: tNav("brand"), path: "" },
            { name: tNav("service"), path: "/service" },
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
          <h1>{typo(t("title"))}</h1>
          <p className="company-lead">{typo(t("lead"))}</p>
        </header>

        <section className="company-block" aria-labelledby="service-check">
          <h2 id="service-check">{typo(t("checklistHeading"))}</h2>
          <ul className="company-checklist">
            <li>{typo(t("checklist1"))}</li>
            <li>{typo(t("checklist2"))}</li>
            <li>{typo(t("checklist3"))}</li>
          </ul>
          <div className="company-cta">
            <Button href="/catalog" variant="secondary">
              {t("catalogLink")}
            </Button>
          </div>
        </section>

        <section className="company-block" aria-labelledby="service-process">
          <h2 id="service-process" className="text-balance">
            {typo(t("processHeading"))}
          </h2>
          <ol className="process-steps">
            {PROCESS_STEPS.map((step) => (
              <li key={step} className="process-step">
                <span className="process-step-index tabular-nums" aria-hidden="true">
                  {step.padStart(2, "0")}
                </span>
                <h3 className="text-balance">
                  {typo(t(`process${step}Title`))}
                </h3>
                <p className="text-pretty">
                  {typo(t(`process${step}Body`))}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="company-contacts-grid">
          <section className="company-block" aria-labelledby="service-form">
            <h2 id="service-form">{typo(t("formHeading"))}</h2>
            <div className="quote-teaser-panel company-form-panel">
              <Suspense fallback={<QuoteFormFallback />}>
                <ServiceRequestForm
                  turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
                  idPrefix="service-page"
                />
              </Suspense>
            </div>
          </section>

          <section className="company-block" aria-labelledby="service-tech">
            <h2 id="service-tech" className="text-balance">
              {typo(t("techHeading"))}
            </h2>
            {!hasDirectContacts ? (
              <p className="company-block-note text-pretty">
                {typo(t("techLead"))}
              </p>
            ) : null}
            <div className="service-tech-card premium-frame">
              <dl className="company-contact-dl">
                {phones.length > 0 ? (
                  <>
                    <dt>{t("phone")}</dt>
                    <dd>
                      <ul className="contact-phones">
                        {phones.map((phone) => (
                          <li key={phone}>
                            <a href={telHref(phone)}>{phone}</a>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </>
                ) : null}
                {email ? (
                  <>
                    <dt>{t("email")}</dt>
                    <dd>
                      <a href={`mailto:${email}`}>{email}</a>
                    </dd>
                  </>
                ) : null}
                {address ? (
                  <>
                    <dt>{t("address")}</dt>
                    <dd>
                      <p>{address}</p>
                      {mapUrl ? (
                        <a href={mapUrl} rel="noopener noreferrer" target="_blank">
                          {t("mapLink")}
                        </a>
                      ) : null}
                    </dd>
                  </>
                ) : null}
                {hours ? (
                  <>
                    <dt>{t("hours")}</dt>
                    <dd className="contact-hours">{hours}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          </section>
        </div>

        <section className="company-block" aria-labelledby="service-faq">
          <h2 id="service-faq" className="text-balance">
            {typo(t("faqHeading"))}
          </h2>
          <div className="service-faq">
            {FAQ_ITEMS.map((item) => (
              <details key={item} className="service-faq-item premium-frame">
                <summary className="service-faq-summary text-balance">
                  {typo(t(`faq${item}Q`))}
                </summary>
                <p className="service-faq-answer text-pretty">
                  {typo(t(`faq${item}A`))}
                </p>
              </details>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
