"use server";

import { headers } from "next/headers";

import en from "../../../messages/en.json";
import uk from "../../../messages/uk.json";
import { routing } from "@/i18n/routing";

import { initialLeadFormState } from "./form-state";
import { LEAD_INTENTS, type LeadIntent } from "./intents";
import { processLeadSubmission, type SubmitLeadMessages } from "./submit";
import type { LeadFormState } from "./types";

const LOCALES = { uk, en } as const;

type FormMessages = {
  errorName: string;
  errorContact: string;
  errorConsent: string;
  errorComment: string;
  errorGeneric: string;
  errorRateLimit: string;
  errorDelivery: string;
  errorTurnstile: string;
  success: string;
};

function localeFromForm(formData: FormData): keyof typeof LOCALES {
  const raw = String(formData.get("locale") ?? routing.defaultLocale);
  if (raw === "en" || raw === "uk") return raw;
  return routing.defaultLocale;
}

function intentFromForm(formData: FormData): LeadIntent {
  const raw = String(formData.get("intent") ?? "quote");
  return (LEAD_INTENTS as readonly string[]).includes(raw)
    ? (raw as LeadIntent)
    : "quote";
}

function messagesForIntent(
  locale: keyof typeof LOCALES,
  intent: LeadIntent,
): SubmitLeadMessages {
  const bag = LOCALES[locale];
  const ns: FormMessages =
    intent === "service"
      ? bag.service
      : intent === "other"
        ? bag.contacts
        : bag.quote;

  return {
    errorName: ns.errorName,
    errorContact: ns.errorContact,
    errorConsent: ns.errorConsent,
    errorSector: bag.quote.errorSector,
    errorKg: bag.quote.errorKg,
    errorComment: ns.errorComment,
    errorGeneric: ns.errorGeneric,
    errorRateLimit: ns.errorRateLimit,
    errorDelivery: ns.errorDelivery,
    errorTurnstile: ns.errorTurnstile,
    success: ns.success,
  };
}

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Avoid next-intl getLocale/getTranslations here: root-params are unavailable in Server Actions.
  const locale = localeFromForm(formData);
  const intent = intentFromForm(formData);
  const headerList = await headers();

  return processLeadSubmission(formData, {
    locale,
    headers: headerList,
    messages: messagesForIntent(locale, intent),
  });
}

export async function getEmptyLeadState(): Promise<LeadFormState> {
  return initialLeadFormState();
}
