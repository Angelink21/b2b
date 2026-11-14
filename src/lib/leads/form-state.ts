import type { LeadFormState, LeadFormValues } from "./types";

export const emptyLeadValues: LeadFormValues = {
  name: "",
  company: "",
  contact: "",
  sector: "",
  kgPerShift: "",
  modelSlugs: [],
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

export function valuesFromFormData(formData: FormData): LeadFormValues {
  const modelsRaw = formData.getAll("modelSlugs");
  const modelSlugs = modelsRaw
    .flatMap((value) => String(value).split(","))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return {
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    sector: String(formData.get("sector") ?? ""),
    kgPerShift: String(formData.get("kgPerShift") ?? ""),
    modelSlugs: [...new Set(modelSlugs)].slice(0, 12),
    comment: String(formData.get("comment") ?? ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  };
}
