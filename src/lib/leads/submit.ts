import { randomUUID } from "node:crypto";

import { getEnv } from "@/env";

import { dispatchLead } from "./dispatch";
import {
  getIdempotentResult,
  rememberIdempotentResult,
} from "./idempotency";
import { valuesFromFormData } from "./form-state";
import { checkLeadRateLimit } from "./rate-limit";
import { leadAntiSpamSchema, leadFieldsSchema } from "./schema";
import { verifyTurnstile } from "./turnstile";
import type { LeadFieldErrors, LeadFormState, LeadPayload } from "./types";

export type SubmitLeadMessages = {
  errorName: string;
  errorContact: string;
  errorConsent: string;
  errorSector: string;
  errorKg: string;
  errorGeneric: string;
  errorRateLimit: string;
  errorDelivery: string;
  errorTurnstile: string;
  success: string;
};

function mapFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
  messages: SubmitLeadMessages,
): LeadFieldErrors {
  const errors: LeadFieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key === "name" && !errors.name) errors.name = messages.errorName;
    if (key === "contact" && !errors.contact)
      errors.contact = messages.errorContact;
    if (key === "consent" && !errors.consent)
      errors.consent = messages.errorConsent;
    if (key === "sector" && !errors.sector)
      errors.sector = messages.errorSector;
    if (key === "kgPerShift" && !errors.kgPerShift)
      errors.kgPerShift = messages.errorKg;
  }
  return errors;
}

function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

export async function processLeadSubmission(
  formData: FormData,
  opts: {
    locale: string;
    headers: Headers;
    messages: SubmitLeadMessages;
  },
): Promise<LeadFormState> {
  const values = valuesFromFormData(formData);
  const env = getEnv();

  const anti = leadAntiSpamSchema.safeParse({
    honeypot: String(formData.get("website") ?? ""),
    startedAt: String(formData.get("startedAt") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    turnstileToken: String(formData.get("cf-turnstile-response") ?? ""),
  });

  // Honeypot filled → fake success (do not tip off bots, do not dispatch).
  if (anti.success && anti.data.honeypot.length > 0) {
    return {
      status: "success",
      fieldErrors: {},
      formError: null,
      values,
      leadId: randomUUID(),
    };
  }

  if (!anti.success) {
    return {
      status: "error",
      fieldErrors: {},
      formError: opts.messages.errorGeneric,
      values,
      leadId: null,
    };
  }

  const cached = getIdempotentResult(anti.data.idempotencyKey);
  if (cached) return cached;

  const elapsed = Date.now() - anti.data.startedAt;
  if (elapsed < env.minFillMs) {
    return {
      status: "error",
      fieldErrors: {},
      formError: opts.messages.errorGeneric,
      values,
      leadId: null,
    };
  }

  const ip = clientIpFromHeaders(opts.headers);
  const rate = await checkLeadRateLimit(ip);
  if (!rate.allowed) {
    return {
      status: "error",
      fieldErrors: {},
      formError: opts.messages.errorRateLimit,
      values,
      leadId: null,
    };
  }

  const parsed = leadFieldsSchema.safeParse({
    name: values.name,
    company: values.company,
    contact: values.contact,
    sector: values.sector,
    kgPerShift: values.kgPerShift,
    modelSlugs: values.modelSlugs,
    comment: values.comment,
    consent: values.consent ? true : false,
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: mapFieldErrors(parsed.error.issues, opts.messages),
      formError: null,
      values,
      leadId: null,
    };
  }

  const turnstileOk = await verifyTurnstile(anti.data.turnstileToken, ip);
  if (!turnstileOk) {
    return {
      status: "error",
      fieldErrors: { turnstile: opts.messages.errorTurnstile },
      formError: opts.messages.errorTurnstile,
      values,
      leadId: null,
    };
  }

  const leadId = randomUUID();
  const payload: LeadPayload = {
    leadId,
    name: parsed.data.name,
    company: parsed.data.company,
    contact: parsed.data.contact,
    sector: parsed.data.sector,
    kgPerShift: parsed.data.kgPerShift,
    modelSlugs: parsed.data.modelSlugs,
    comment: parsed.data.comment,
    locale: opts.locale,
    submittedAt: new Date().toISOString(),
  };

  const { accepted } = await dispatchLead(payload, {
    idempotencyKey: anti.data.idempotencyKey,
  });

  if (!accepted) {
    const failure: LeadFormState = {
      status: "error",
      fieldErrors: {},
      formError: opts.messages.errorDelivery,
      values,
      leadId: null,
    };
    return failure;
  }

  const success: LeadFormState = {
    status: "success",
    fieldErrors: {},
    formError: null,
    values,
    leadId,
  };
  rememberIdempotentResult(anti.data.idempotencyKey, success);
  return success;
}
