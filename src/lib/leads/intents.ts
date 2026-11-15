export const LEAD_INTENTS = ["quote", "service", "other"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];
