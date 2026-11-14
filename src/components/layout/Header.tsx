import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Container } from "@/components/ui/Container";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link } from "@/i18n/navigation";

export async function Header() {
  const t = await getTranslations("nav");

  return (
    <header className="site-header sticky top-0 z-50 border-b border-line bg-bg">
      <Container className="flex h-16 items-center gap-4">
        <Link
          href="/"
          className="font-serif text-[22px] font-normal text-ink no-underline"
        >
          {t("brand")}
        </Link>
        <nav aria-label={t("mainNav")} className="hidden items-center gap-6 md:flex">
          <Link
            href="/catalog"
            className="text-steel no-underline hover:text-ink"
          >
            {t("catalog")}
          </Link>
          <Link href="/#industries" className="text-steel no-underline hover:text-ink">
            {t("industries")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/quote" className="btn btn-red btn-sm">
            {t("quote")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
