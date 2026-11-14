import type { SectorKey } from "@/lib/catalog/schema";

export type LeadPayload = {
  leadId: string;
  name: string;
  company: string;
  contact: string;
  sector: SectorKey | null;
  kgPerShift: number | null;
  modelSlugs: string[];
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
    | "comment"
    | "consent"
    | "turnstile",
    string
  >
>;

export type LeadFormValues = {
  name: string;
  company: string;
  contact: string;
  sector: string;
  kgPerShift: string;
  modelSlugs: string[];
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
