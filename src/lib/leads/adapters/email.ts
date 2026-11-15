import { getEnv } from "@/env";

import { escapeHtml } from "../escape";
import type { LeadPayload, LeadSendMeta, LeadSink } from "../types";

function buildHtml(payload: LeadPayload): string {
  const rows: Array<[string, string]> = [
    ["Lead ID", payload.leadId],
    ["Intent", payload.intent],
    ["Name", payload.name],
    ["Company", payload.company || "—"],
    ["Contact", payload.contact],
    ["Sector", payload.sector ?? "—"],
    ["Kg / shift", payload.kgPerShift?.toString() ?? "—"],
    ["Models", payload.modelSlugs.join(", ") || "—"],
    ["Model label", payload.modelLabel || "—"],
    ["Serial", payload.serialNumber || "—"],
    ["Comment", payload.comment || "—"],
    ["Locale", payload.locale],
    ["Submitted", payload.submittedAt],
  ];
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table>${body}</table>`;
}

export const emailSink: LeadSink = {
  id: "email",
  async send(payload: LeadPayload, meta: LeadSendMeta) {
    const env = getEnv();
    if (!env.RESEND_API_KEY || !env.LEADS_EMAIL_FROM || !env.LEADS_EMAIL_TO) {
      return { ok: false, error: "email-not-configured" };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": meta.idempotencyKey,
      },
      body: JSON.stringify({
        from: env.LEADS_EMAIL_FROM,
        to: [env.LEADS_EMAIL_TO],
        subject: `Lead (${payload.intent}) ${payload.leadId}`,
        html: buildHtml(payload),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { ok: false, error: `email-http-${res.status}` };
    }
    return { ok: true };
  },
};
