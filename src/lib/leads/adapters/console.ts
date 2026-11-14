import type { LeadPayload, LeadSendMeta, LeadSink } from "../types";

/** Logs acceptance metadata only — never PII or payload body. */
export const consoleSink: LeadSink = {
  id: "console",
  async send(payload: LeadPayload, _meta: LeadSendMeta) {
    console.info(
      JSON.stringify({
        kind: "lead",
        sink: "console",
        leadId: payload.leadId,
        ok: true,
      }),
    );
    return { ok: true };
  },
};
