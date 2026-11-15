import type { SectorKey } from "@/lib/catalog/schema";

import type { LeadIntent } from "./intents";

export type LeadPayload = {
  leadId: string;
  intent: LeadIntent;
  name: string;
  company: string;
  contact: string;
  sector: SectorKey | null;
  kgPerShift: number | null;
  modelSlugs: string[];
  modelLabel: string;
  serialNumber: string;
  comment: string;
  locale: string;
  submittedAt: string;
};

export type LeadSendMeta = {
  idempotencyKey: string;
};

export type LeadSinkResult = {
  ok: boolean;
  error?: string;
};

export type LeadSink = {
  id: string;
  send: (
    payload: LeadPayload,
    meta: LeadSendMeta,
  ) => Promise<LeadSinkResult>;
};

export type LeadFieldErrors = Partial<
  Record<
    | "name"
    | "company"
    | "contact"
    | "sector"
    | "kgPerShift"
    | "models"
    | "modelLabel"
    | "serialNumber"
    | "comment"
    | "intent"
    | "consent"
    | "turnstile",
    string
  >
>;

export type LeadFormValues = {
  intent: LeadIntent;
  name: string;
  company: string;
  contact: string;
  sector: string;
  kgPerShift: string;
  modelSlugs: string[];
  modelLabel: string;
  serialNumber: string;
  comment: string;
  consent: boolean;
};

export type LeadFormState = {
  status: "idle" | "error" | "success";
  fieldErrors: LeadFieldErrors;
  formError: string | null;
  values: LeadFormValues;
  leadId: string | null;
};
