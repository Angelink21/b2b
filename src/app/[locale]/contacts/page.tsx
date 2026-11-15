import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { ContactRequestForm } from "@/components/contacts/ContactRequestForm";
import { QuoteFormFallback } from "@/components/quote/QuoteForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { siteConfig, visibleContact } from "@/config/site";
import { getEnv } from "@/env";
import {
  breadcrumbListJsonLd,
  contactPageJsonLd,
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
    path: "/contacts",
    title: t("contactsTitle"),
    description: t("contactsDescription"),
  });
}

export default async function ContactsPage() {
  const locale = await getLocale();
  const t = await getTranslations("contacts");
  const tNav = await getTranslations("nav");
  const env = getEnv();

  const phone = visibleContact(siteConfig.phone);
  const email = visibleContact(siteConfig.email);
  const address = visibleContact(siteConfig.address);
  const hours = visibleContact(siteConfig.hours);
  const hasDetails = Boolean(phone || email || address || hours);
  const mapEmbedSrc = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`
    : null;

  const crumbs = [
    { label: tNav("brand"), href: "/" },
    { label: tNav("contacts") },
  ];

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          contactPageJsonLd(locale),
          breadcrumbListJsonLd(locale, [
            { name: tNav("brand"), path: "" },
            { name: tNav("contacts"), path: "/contacts" },
          ]),
        ]}
      />
      <Container className="company-page py-12">
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

        <div className="company-contacts-grid">
          <section className="company-block" aria-labelledby="contacts-form">
            <h2 id="contacts-form" className="text-balance">
              {typo(t("formHeading"))}
            </h2>
            <div className="quote-teaser-panel company-form-panel">
              <Suspense fallback={<QuoteFormFallback />}>
                <ContactRequestForm
                  turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
                  idPrefix="contacts-page"
                />
              </Suspense>
            </div>
          </section>

          <section className="company-block" aria-labelledby="contacts-details">
            <h2 id="contacts-details" className="text-balance">
              {typo(t("detailsHeading"))}
            </h2>
            {hasDetails ? (
              <div className="contacts-details-card premium-frame">
                <dl className="company-contact-dl">
                  {phone ? (
                    <>
                      <dt>{t("phone")}</dt>
                      <dd>
                        <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>
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
                        <p className="contacts-warehouse-note text-pretty">
                          {typo(t("warehouseNote"))}
                        </p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {t("mapLink")}
                        </a>
                      </dd>
                    </>
                  ) : null}
                  {hours ? (
                    <>
                      <dt>{t("hours")}</dt>
                      <dd>{hours}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            ) : (
              <p className="text-steel text-pretty">{typo(t("emptyDetails"))}</p>
            )}
          </section>
        </div>

        {mapEmbedSrc ? (
          <section className="company-block" aria-labelledby="contacts-map">
            <h2 id="contacts-map" className="text-balance">
              {typo(t("mapHeading"))}
            </h2>
            <div className="contacts-map premium-frame">
              <div className="contacts-map-frame">
                <iframe
                  title={t("mapIframeTitle")}
                  src={mapEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  width={1200}
                  height={675}
                />
              </div>
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}
