"use server";

import { headers } from "next/headers";

import en from "../../../messages/en.json";
import uk from "../../../messages/uk.json";
import { routing } from "@/i18n/routing";

import { initialLeadFormState } from "./form-state";
import { processLeadSubmission } from "./submit";
import type { LeadFormState } from "./types";

const QUOTE_MESSAGES = {
  uk: uk.quote,
  en: en.quote,
} as const;

function localeFromForm(formData: FormData): keyof typeof QUOTE_MESSAGES {
  const raw = String(formData.get("locale") ?? routing.defaultLocale);
  if (raw === "en" || raw === "uk") return raw;
  return routing.defaultLocale;
}

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Avoid next-intl getLocale/getTranslations here: root-params are unavailable in Server Actions.
  const locale = localeFromForm(formData);
  const t = QUOTE_MESSAGES[locale];
  const headerList = await headers();

  return processLeadSubmission(formData, {
    locale,
    headers: headerList,
    messages: {
      errorName: t.errorName,
      errorContact: t.errorContact,
      errorConsent: t.errorConsent,
      errorSector: t.errorSector,
      errorKg: t.errorKg,
      errorGeneric: t.errorGeneric,
      errorRateLimit: t.errorRateLimit,
      errorDelivery: t.errorDelivery,
      errorTurnstile: t.errorTurnstile,
      success: t.success,
    },
  });
}

export async function getEmptyLeadState(): Promise<LeadFormState> {
  return initialLeadFormState();
}
