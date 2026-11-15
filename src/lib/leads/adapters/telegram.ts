import { getEnv } from "@/env";

import { escapeMarkdownV2 } from "../escape";
import type { LeadPayload, LeadSendMeta, LeadSink } from "../types";

function buildMessage(payload: LeadPayload): string {
  const lines = [
    `*Lead* ${escapeMarkdownV2(payload.leadId)}`,
    `Intent: ${escapeMarkdownV2(payload.intent)}`,
    `Name: ${escapeMarkdownV2(payload.name)}`,
    `Company: ${escapeMarkdownV2(payload.company || "—")}`,
    `Contact: ${escapeMarkdownV2(payload.contact)}`,
    `Sector: ${escapeMarkdownV2(payload.sector ?? "—")}`,
    `Kg: ${escapeMarkdownV2(payload.kgPerShift?.toString() ?? "—")}`,
    `Models: ${escapeMarkdownV2(payload.modelSlugs.join(", ") || "—")}`,
    `Model: ${escapeMarkdownV2(payload.modelLabel || "—")}`,
    `Serial: ${escapeMarkdownV2(payload.serialNumber || "—")}`,
    `Comment: ${escapeMarkdownV2(payload.comment || "—")}`,
    `Locale: ${escapeMarkdownV2(payload.locale)}`,
  ];
  return lines.join("\n");
}

export const telegramSink: LeadSink = {
  id: "telegram",
  async send(payload: LeadPayload, _meta: LeadSendMeta) {
    const env = getEnv();
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return { ok: false, error: "telegram-not-configured" };
    }

    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: buildMessage(payload),
        parse_mode: "MarkdownV2",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { ok: false, error: `telegram-http-${res.status}` };
    }
    return { ok: true };
  },
};
