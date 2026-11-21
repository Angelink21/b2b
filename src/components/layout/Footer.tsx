import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import {
  siteConfig,
  telHref,
  visibleContact,
  visiblePhones,
} from "@/config/site";
import { Link } from "@/i18n/navigation";
import { CATEGORY_SLUGS } from "@/lib/catalog/schema";
import { typo } from "@/lib/typo";

/** Stable during prerender; the days profile lets the year roll over. */
async function copyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const COMPANY = [
  { href: "/about", key: "about" },
  { href: "/service", key: "service" },
  { href: "/contacts", key: "contacts" },
] as const;

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tCat = await getTranslations("categories");
  const year = await copyrightYear();
  const phones = visiblePhones();
  const email = visibleContact(siteConfig.email);
  const address = visibleContact(siteConfig.address);
  const hasContact = Boolean(phones.length > 0 || email || address);

  return (
    <footer className="site-footer">
      <Container>
        <Grid>
          <nav
            aria-label={tNav("catalog")}
            className="site-footer-col site-footer-col--catalog"
          >
            <h2>{tNav("catalog")}</h2>
            <ul className="site-footer-links">
              {CATEGORY_SLUGS.map((slug) => (
                <li key={slug}>
                  <Link href={`/catalog/${slug}`}>{tCat(slug)}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t("company")} className="site-footer-col site-footer-col--company">
            <h2>{t("company")}</h2>
            <ul className="site-footer-links">
              {COMPANY.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{typo(tNav(item.key))}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-footer-col site-footer-col--quote">
            <h2>{tNav("quote")}</h2>
            <p className="site-footer-quote-prompt">{typo(t("quotePrompt"))}</p>
            <Button href="/quote" variant="primary">
              {tNav("quote")}
            </Button>
          </div>

          <div className="site-footer-col site-footer-col--brand">
            <h2 translate="no">{siteConfig.name}</h2>
            {hasContact ? (
              <ul className="site-footer-links">
                {phones.map((phone) => (
                  <li key={phone}>
                    <a href={telHref(phone)}>{phone}</a>
                  </li>
                ))}
                {email ? (
                  <li>
                    <a href={`mailto:${email}`}>{email}</a>
                  </li>
                ) : null}
                {address ? (
                  <li>
                    <p className="site-footer-address">{address}</p>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="site-footer-base">
            <p className="footer-legal">{siteConfig.name}</p>
            <Link href="/privacy" className="footer-privacy">
              {t("privacy")}
            </Link>
            <div className="footer-locale">
              <LocaleSwitcher />
            </div>
            <p className="footer-copy">{t("copyright", { year })}</p>
          </div>
        </Grid>
      </Container>
    </footer>
  );
}
