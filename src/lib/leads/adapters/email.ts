import { siteConfig, visibleContact } from "@/config/site";
import { getEnv } from "@/env";

import { escapeHtml } from "../escape";
import type { LeadPayload, LeadSendMeta, LeadSink } from "../types";

/** Recipient: LEADS_EMAIL_TO, else the public email from siteConfig. */
export function resolveLeadEmailTo(
  envTo: string | undefined = getEnv().LEADS_EMAIL_TO,
): string | null {
  const fromEnv = envTo?.trim();
  if (fromEnv) return fromEnv;
  return visibleContact(siteConfig.email);
}

function buildHtml(payload: LeadPayload): string {
  const rows: Array<[string, string]> = [
    ["Lead ID", payload.leadId],
    ["Intent", payload.intent],
    ["Name", payload.name],
    ["Company", payload.company || "—"],
    ["Contact", payload.contact],
    ["Sector", payload.sector ?? "—"],
    ["Kg / hour", payload.kgPerShift?.toString() ?? "—"],
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
    const to = resolveLeadEmailTo(env.LEADS_EMAIL_TO);
    if (!env.RESEND_API_KEY || !env.LEADS_EMAIL_FROM || !to) {
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
        to: [to],
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
