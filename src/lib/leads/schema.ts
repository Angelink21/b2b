import { z } from "zod";

import { SECTOR_KEYS } from "@/lib/catalog/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits with common phone separators; at least 7 digits. */
const PHONE_RE = /^\+?[\d\s()./-]{7,}$/;

export function isEmailOrPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (EMAIL_RE.test(trimmed)) return true;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && PHONE_RE.test(trimmed);
}

export const leadFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(160).optional().default(""),
  contact: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .refine(isEmailOrPhone, { message: "contact" }),
  sector: z
    .union([z.enum(SECTOR_KEYS), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  kgPerShift: z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const n = Number(value.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 100_000) {
        ctx.addIssue({
          code: "custom",
          message: "kgPerShift",
        });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    }),
  modelSlugs: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  comment: z.string().trim().max(2000).optional().default(""),
  consent: z.literal(true, {
    error: "consent",
  }),
});

export type LeadFields = z.infer<typeof leadFieldsSchema>;

export const leadAntiSpamSchema = z.object({
  honeypot: z.string().max(0),
  startedAt: z.coerce.number().int().positive(),
  idempotencyKey: z.string().uuid(),
  turnstileToken: z.string().optional().default(""),
});
