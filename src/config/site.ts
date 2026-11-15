/**
 * Public site identity for metadata / JSON-LD.
 * Do not invent address, phone, or email — only known fields.
 * Empty contact fields stay hidden in the footer.
 */

export type LogoSlot = {
  /** Public path or remote URL. Empty string keeps the text brand. */
  src: string;
  /** Required once `src` is set so the 72px bar does not shift. */
  width: number;
  height: number;
};

export const siteConfig: {
  name: string;
  logo: LogoSlot;
  phone: string;
  email: string;
  address: string;
  /** Business hours text; empty keeps the hours block hidden. */
  hours: string;
  readonly url: string | undefined;
} = {
  name: "Fagor Industrial",
  logo: {
    src: "",
    width: 0,
    height: 0,
  },
  phone: "",
  email: "",
  /** Empty until the owner confirms a public address. */
  address: "",
  hours: "",
  /** Set via NEXT_PUBLIC_SITE_URL; omitted from JSON-LD when empty. */
  get url(): string | undefined {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    return raw && raw.length > 0 ? raw.replace(/\/$/, "") : undefined;
  },
};

/** Footer shows a contact line only when the field is filled in. */
export function visibleContact(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
