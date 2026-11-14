/**
 * Public site identity for metadata / JSON-LD.
 * Do not invent address, phone, or email — only known fields.
 */
export const siteConfig = {
  name: "Fagor Industrial",
  /** Set via NEXT_PUBLIC_SITE_URL; omitted from JSON-LD when empty. */
  get url(): string | undefined {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    return raw && raw.length > 0 ? raw.replace(/\/$/, "") : undefined;
  },
} as const;
