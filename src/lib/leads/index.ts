/**
 * Server-oriented barrel. Client components must import from `@/lib/leads/client`
 * so Node-only adapters (HMAC webhook, sinks) stay out of the browser graph.
 */
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
  LEAD_INTENTS,
  leadAntiSpamSchema,
  leadFieldsSchema,
} from "./schema";
export type { LeadIntent } from "./intents";
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
