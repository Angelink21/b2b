import { LEAD_INTENTS, type LeadIntent } from "./intents";
import type { LeadFormState, LeadFormValues } from "./types";

export const emptyLeadValues: LeadFormValues = {
  intent: "quote",
  name: "",
  company: "",
  contact: "",
  sector: "",
  kgPerShift: "",
  modelSlugs: [],
  modelLabel: "",
  serialNumber: "",
  comment: "",
  consent: false,
};

export function initialLeadFormState(
  overrides?: Partial<LeadFormValues>,
): LeadFormState {
  return {
    status: "idle",
    fieldErrors: {},
    formError: null,
    values: { ...emptyLeadValues, ...overrides },
    leadId: null,
  };
}

function parseIntent(raw: FormDataEntryValue | null): LeadIntent {
  const value = String(raw ?? "quote");
  return (LEAD_INTENTS as readonly string[]).includes(value)
    ? (value as LeadIntent)
    : "quote";
}

export function valuesFromFormData(formData: FormData): LeadFormValues {
  const modelsRaw = formData.getAll("modelSlugs");
  const modelSlugs = modelsRaw
    .flatMap((value) => String(value).split(","))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return {
    intent: parseIntent(formData.get("intent")),
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    sector: String(formData.get("sector") ?? ""),
    kgPerShift: String(formData.get("kgPerShift") ?? ""),
    modelSlugs: [...new Set(modelSlugs)].slice(0, 12),
    modelLabel: String(formData.get("modelLabel") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  };
}
