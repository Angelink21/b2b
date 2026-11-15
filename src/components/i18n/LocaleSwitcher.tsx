"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LABEL: Record<AppLocale, string> = {
  uk: "UA",
  en: "EN",
};

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`locale-switch ${className}`.trim()}
    >
      {routing.locales.map((code, index) => {
        const current = code === locale;
        return (
          <span key={code} className="locale-switch-item">
            {index > 0 ? (
              <span className="locale-sep" aria-hidden="true">
                |
              </span>
            ) : null}
            <Link
              href={pathname}
              locale={code}
              hrefLang={code}
              lang={code}
              aria-current={current ? "page" : undefined}
            >
              {LABEL[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
