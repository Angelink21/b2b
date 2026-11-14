import { routing, type AppLocale } from "@/i18n/routing";

import { getSiteUrl } from "./site-url";

/**
 * Path without locale prefix.
 * Examples: "", "/catalog", "/catalog/washers/lap-08-tp2-e"
 */
export type LocalePath = string;

export function normalizeLocalePath(path: LocalePath): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function localizedPath(locale: string, path: LocalePath): string {
  return `/${locale}${normalizeLocalePath(path)}`;
}

export function absoluteUrl(locale: string, path: LocalePath): string {
  return `${getSiteUrl()}${localizedPath(locale, path)}`;
}

/** hreflang map including x-default → default locale (uk). */
export function languageAlternates(path: LocalePath): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, path);
  }
  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);
  return languages;
}

export function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}
