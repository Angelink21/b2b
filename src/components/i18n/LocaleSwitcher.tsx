"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  const other = (routing.locales.find((l) => l !== locale) ?? "en") as AppLocale;
  const label = other === "uk" ? "UA" : "EN";

  return (
    <Link
      href={pathname}
      locale={other}
      className="header-tool"
      aria-label={`${t("language")}: ${label}`}
      hrefLang={other}
      lang={other}
    >
      {label}
    </Link>
  );
}
