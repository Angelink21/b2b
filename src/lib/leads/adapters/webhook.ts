import { createHmac } from "node:crypto";

import { getEnv } from "@/env";

import type { LeadPayload, LeadSendMeta, LeadSink } from "../types";

export function signWebhookBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export const webhookSink: LeadSink = {
  id: "webhook",
  async send(payload: LeadPayload, meta: LeadSendMeta) {
    const env = getEnv();
    if (!env.LEADS_WEBHOOK_URL || !env.LEADS_WEBHOOK_SECRET) {
      return { ok: false, error: "webhook-not-configured" };
    }

    const body = JSON.stringify({
      leadId: payload.leadId,
      intent: payload.intent,
      name: payload.name,
      company: payload.company,
      contact: payload.contact,
      sector: payload.sector,
      kgPerShift: payload.kgPerShift,
      modelSlugs: payload.modelSlugs,
      modelLabel: payload.modelLabel,
      serialNumber: payload.serialNumber,
      comment: payload.comment,
      locale: payload.locale,
      submittedAt: payload.submittedAt,
      idempotencyKey: meta.idempotencyKey,
    });
    const signature = signWebhookBody(body, env.LEADS_WEBHOOK_SECRET);

    const res = await fetch(env.LEADS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Fagor-Signature": signature,
        "X-Idempotency-Key": meta.idempotencyKey,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { ok: false, error: `webhook-http-${res.status}` };
    }
    return { ok: true };
  },
};
