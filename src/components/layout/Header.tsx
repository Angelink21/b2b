import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Container } from "@/components/ui/Container";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link } from "@/i18n/navigation";

export async function Header() {
  const t = await getTranslations("nav");

  return (
    <header className="site-header">
      <Container className="site-header-bar">
        <Link href="/" className="site-brand">
          {t("brand")}
        </Link>
        <nav aria-label={t("mainNav")} className="site-nav">
          <Link href="/catalog" className="site-nav-link">
            {t("catalog")}
          </Link>
          <Link href="/#industries" className="site-nav-link">
            {t("industries")}
          </Link>
        </nav>
        <div className="site-header-actions">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/quote" className="btn btn-red">
            {t("quote")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
