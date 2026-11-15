import { afterEach, describe, expect, it, vi } from "vitest";

import { resetEnvCache } from "@/env";

import { signWebhookBody } from "./adapters/webhook";
import { consoleSink } from "./adapters/console";
import { dispatchLead } from "./dispatch";
import { escapeHtml, escapeMarkdownV2 } from "./escape";
import {
  getIdempotentResult,
  rememberIdempotentResult,
  resetIdempotencyStore,
} from "./idempotency";
import { initialLeadFormState } from "./form-state";
import { resetRateLimitMemory } from "./rate-limit";
import { isEmailOrPhone, leadFieldsSchema } from "./schema";
import type { LeadPayload } from "./types";

const samplePayload: LeadPayload = {
  leadId: "11111111-1111-4111-8111-111111111111",
  intent: "quote",
  name: "Alex",
  company: "Acme",
  contact: "alex@example.com",
  sector: "hospitals",
  kgPerShift: 40,
  modelSlugs: ["lap-08-tp2-e"],
  modelLabel: "",
  serialNumber: "",
  comment: "Need quote",
  locale: "uk",
  submittedAt: "2026-11-14T12:00:00.000Z",
};

afterEach(() => {
  resetIdempotencyStore();
  resetRateLimitMemory();
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("isEmailOrPhone", () => {
  it("accepts email and phone", () => {
    expect(isEmailOrPhone("sales@fagor.example")).toBe(true);
    expect(isEmailOrPhone("+380671234567")).toBe(true);
    expect(isEmailOrPhone("123")).toBe(false);
    expect(isEmailOrPhone("")).toBe(false);
  });
});

describe("leadFieldsSchema", () => {
  it("requires name, contact, consent", () => {
    const ok = leadFieldsSchema.safeParse({
      name: "Ivan",
      contact: "ivan@example.com",
      consent: true,
      modelSlugs: [],
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.intent).toBe("quote");

    const bad = leadFieldsSchema.safeParse({
      name: "",
      contact: "nope",
      consent: false,
      modelSlugs: [],
    });
    expect(bad.success).toBe(false);
  });

  it("requires comment for service intent", () => {
    const missing = leadFieldsSchema.safeParse({
      intent: "service",
      name: "Ivan",
      contact: "ivan@example.com",
      consent: true,
      comment: "",
      modelSlugs: [],
    });
    expect(missing.success).toBe(false);

    const ok = leadFieldsSchema.safeParse({
      intent: "service",
      name: "Ivan",
      contact: "ivan@example.com",
      consent: true,
      comment: "Drum does not spin",
      modelLabel: "LAP-08",
      serialNumber: "SN-1",
      modelSlugs: [],
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.intent).toBe("service");
      expect(ok.data.modelLabel).toBe("LAP-08");
    }
  });

  it("allows other intent without comment", () => {
    const ok = leadFieldsSchema.safeParse({
      intent: "other",
      name: "Ivan",
      contact: "ivan@example.com",
      consent: true,
      modelSlugs: [],
    });
    expect(ok.success).toBe(true);
  });

  it("parses kg and rejects invalid kg", () => {
    const ok = leadFieldsSchema.safeParse({
      name: "Ivan",
      contact: "+380671234567",
      consent: true,
      kgPerShift: "25,5",
      modelSlugs: ["a"],
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.kgPerShift).toBe(25.5);

    const bad = leadFieldsSchema.safeParse({
      name: "Ivan",
      contact: "ivan@example.com",
      consent: true,
      kgPerShift: "abc",
      modelSlugs: [],
    });
    expect(bad.success).toBe(false);
  });
});

describe("escape", () => {
  it("escapes html and markdown", () => {
    expect(escapeHtml('<a href="x">\'&')).toContain("&lt;");
    expect(escapeMarkdownV2("a_b*c")).toContain("\\_");
  });
});

describe("consoleSink", () => {
  it("logs metadata without PII", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await consoleSink.send(samplePayload, {
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.ok).toBe(true);
    const logged = String(spy.mock.calls[0]?.[0] ?? "");
    expect(logged).toContain(samplePayload.leadId);
    expect(logged).not.toContain(samplePayload.name);
    expect(logged).not.toContain(samplePayload.contact);
    expect(logged).not.toContain(samplePayload.company);
    expect(logged).not.toContain(samplePayload.comment);
  });
});

describe("dispatchLead", () => {
  it("accepts when at least one sink succeeds", async () => {
    const failing = {
      id: "fail",
      send: async () => ({ ok: false as const, error: "boom" }),
    };
    const okSink = {
      id: "ok",
      send: async () => ({ ok: true as const }),
    };
    const result = await dispatchLead(
      samplePayload,
      { idempotencyKey: "33333333-3333-4333-8333-333333333333" },
      { sinks: [failing, okSink] },
    );
    expect(result.accepted).toBe(true);
    expect(result.results).toEqual([
      expect.objectContaining({ sinkId: "fail", ok: false }),
      expect.objectContaining({ sinkId: "ok", ok: true }),
    ]);
  });

  it("rejects when all sinks fail", async () => {
    const failing = {
      id: "fail",
      send: async () => ({ ok: false as const, error: "boom" }),
    };
    const result = await dispatchLead(
      samplePayload,
      { idempotencyKey: "55555555-5555-4555-8555-555555555555" },
      { sinks: [failing] },
    );
    expect(result.accepted).toBe(false);
  });
});

describe("idempotency", () => {
  it("returns remembered success state", () => {
    const state = {
      ...initialLeadFormState(),
      status: "success" as const,
      leadId: samplePayload.leadId,
    };
    rememberIdempotentResult("44444444-4444-4444-8444-444444444444", state);
    expect(
      getIdempotentResult("44444444-4444-4444-8444-444444444444")?.leadId,
    ).toBe(samplePayload.leadId);
  });
});

describe("webhook HMAC", () => {
  it("signs body stably", () => {
    const body = JSON.stringify({ leadId: "x" });
    const a = signWebhookBody(body, "secret");
    const b = signWebhookBody(body, "secret");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(signWebhookBody(body, "other")).not.toBe(a);
  });
});
