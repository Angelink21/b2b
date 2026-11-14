export { dispatchLead, resolveSinks } from "./dispatch";
export { escapeHtml, escapeMarkdownV2 } from "./escape";
export {
  emptyLeadValues,
  initialLeadFormState,
  valuesFromFormData,
} from "./form-state";
export {
  getIdempotentResult,
  rememberIdempotentResult,
  resetIdempotencyStore,
} from "./idempotency";
export { checkLeadRateLimit, resetRateLimitMemory } from "./rate-limit";
export {
  isEmailOrPhone,
  leadAntiSpamSchema,
  leadFieldsSchema,
} from "./schema";
export { processLeadSubmission } from "./submit";
export { signWebhookBody } from "./adapters/webhook";
export type {
  LeadFieldErrors,
  LeadFormState,
  LeadFormValues,
  LeadPayload,
  LeadSink,
  LeadSinkResult,
} from "./types";
