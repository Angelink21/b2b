import uk from "../../../messages/uk.json";
import en from "../../../messages/en.json";
import type { AppLocale } from "@/i18n/routing";

export type SeoMessages = typeof uk;

const MESSAGES: Record<AppLocale, SeoMessages> = { uk, en };

export function seoMessages(locale: string): SeoMessages {
  if (locale === "en") return MESSAGES.en;
  return MESSAGES.uk;
}
