/**
 * Client-safe lead helpers. Do not re-export adapters/dispatch/submit here —
 * those pull Node crypto into the browser bundle via the barrel.
 */
export { LEAD_INTENTS, type LeadIntent } from "./intents";
export { emptyLeadValues, initialLeadFormState } from "./form-state";
export type {
  LeadFieldErrors,
  LeadFormState,
  LeadFormValues,
} from "./types";
