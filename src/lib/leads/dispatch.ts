import { getEnv } from "@/env";

import { consoleSink } from "./adapters/console";
import { emailSink } from "./adapters/email";
import { telegramSink } from "./adapters/telegram";
import { webhookSink } from "./adapters/webhook";
import type {
  LeadPayload,
  LeadSendMeta,
  LeadSink,
  LeadSinkResult,
} from "./types";

const REGISTRY: Record<string, LeadSink> = {
  console: consoleSink,
  email: emailSink,
  telegram: telegramSink,
  webhook: webhookSink,
};

const TIMEOUT_MS = 9000;
const RETRIES = 1;

async function sendWithRetry(
  sink: LeadSink,
  payload: LeadPayload,
  meta: LeadSendMeta,
): Promise<LeadSinkResult & { sinkId: string }> {
  let last: LeadSinkResult = { ok: false, error: "not-attempted" };
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      last = await Promise.race([
        sink.send(payload, meta),
        new Promise<LeadSinkResult>((resolve) => {
          setTimeout(
            () => resolve({ ok: false, error: "timeout" }),
            TIMEOUT_MS,
          );
        }),
      ]);
      if (last.ok) {
        return { ...last, sinkId: sink.id };
      }
    } catch {
      last = { ok: false, error: "throw" };
    }
  }
  return { ...last, sinkId: sink.id };
}

export function resolveSinks(sinkIds = getEnv().sinks): LeadSink[] {
  const sinks: LeadSink[] = [];
  for (const id of sinkIds) {
    const sink = REGISTRY[id];
    if (sink) sinks.push(sink);
  }
  if (sinks.length === 0) sinks.push(consoleSink);
  return sinks;
}

/** Dispatch to configured sinks. Accepted when at least one succeeds. */
export async function dispatchLead(
  payload: LeadPayload,
  meta: LeadSendMeta,
  options?: { sinks?: LeadSink[] },
): Promise<{ accepted: boolean; results: Array<LeadSinkResult & { sinkId: string }> }> {
  const sinks = options?.sinks ?? resolveSinks();
  const results = await Promise.all(
    sinks.map((sink) => sendWithRetry(sink, payload, meta)),
  );
  const accepted = results.some((result) => result.ok);

  console.info(
    JSON.stringify({
      kind: "lead-dispatch",
      leadId: payload.leadId,
      accepted,
      sinks: results.map((result) => ({
        sink: result.sinkId,
        ok: result.ok,
        error: result.ok ? undefined : result.error,
      })),
    }),
  );

  return { accepted, results };
}
