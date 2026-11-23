import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uk", "en"],
  defaultLocale: "uk",
  localePrefix: "always",
  // Root `/` and unprefixed paths always → uk. Do not follow Accept-Language
  // or NEXT_LOCALE cookie (Telegram/OG crawlers often send en and got /en).
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
