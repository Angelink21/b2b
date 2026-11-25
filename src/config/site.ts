/**
 * Public site identity for metadata / JSON-LD.
 * Do not invent address, phone, or email — only owner-confirmed fields.
 * Empty contact fields stay hidden in the footer.
 */

export type LogoSlot = {
  /** Public path or remote URL. Empty string keeps the text brand. */
  src: string;
  /** Intrinsic pixel size of the asset (for next/image + CLS). */
  width: number;
  height: number;
};

export type LocalizedHours = {
  uk: string;
  en: string;
};

/** Display height in the 72px header; width follows the asset aspect ratio. */
export const LOGO_DISPLAY_HEIGHT = 28;

export type MessengerLink = {
  href: string;
  label: string;
};

export const siteConfig: {
  name: string;
  /** Black wordmark — light theme. */
  logo: LogoSlot;
  /** White wordmark — dark theme (red mark unchanged). */
  logoDark: LogoSlot;
  /** One or more public phones; empty array hides the phone block. */
  phones: readonly string[];
  email: string;
  address: string;
  /** Owner Google Maps link for “open in maps”; empty hides nothing if address alone is set. */
  mapsUrl: string;
  /** iframe embed for /contacts (pin from mapsUrl); empty falls back to address query. */
  mapsEmbedSrc: string;
  /** Localized business hours; empty strings keep the hours block hidden. */
  hours: LocalizedHours;
  /** Optional messengers for the mobile action bar; empty href hides each slot. */
  messengers: readonly MessengerLink[];
  readonly url: string | undefined;
} = {
  name: "Fagor Professional",
  logo: {
    src: "/brand/fagor-logo.png",
    width: 182,
    height: 64,
  },
  logoDark: {
    src: "/brand/fagor-logo-dark.png",
    width: 182,
    height: 64,
  },
  phones: ["044-501-88-87", "050-382-48-78"],
  email: "pkmprofessional@ukr.net",
  address: "вулиця Київська, 27-В, м.Вишневе, Київська область",
  mapsUrl: "https://maps.app.goo.gl/Bym1u3NTiApW5RNu7",
  // Place pin from mapsUrl (Промкомплектмонтаж / Київська 27-В), not bare lat/lng.
  mapsEmbedSrc:
    "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2544!2d30.3300573!3d50.3746758!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4ca3985d2f65b%3A0xfc7ee414f22aeb1d!2z!5e0!3m2!1suk!2sua!4v1!5m2!1suk!2sua",
  hours: {
    uk: "Пн–Пт: 9:00–18:00\nСб–Нд: за попереднім записом",
    en: "Mon–Fri: 9:00–18:00\nSat–Sun: by appointment",
  },
  messengers: [],
  /** Explicit NEXT_PUBLIC_SITE_URL only; SEO absolute URLs use `getSiteUrl()`. */
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

export function visiblePhones(): string[] {
  return siteConfig.phones.map((p) => p.trim()).filter((p) => p.length > 0);
}

export function visibleMessengers(): MessengerLink[] {
  return siteConfig.messengers.filter(
    (link) => link.href.trim().length > 0 && link.label.trim().length > 0,
  );
}

export function localizedHours(locale: string): string | null {
  const raw = locale === "en" ? siteConfig.hours.en : siteConfig.hours.uk;
  return visibleContact(raw);
}

/** Outbound maps link: owner short URL, else address search. */
export function mapsHref(address = siteConfig.address): string | null {
  const maps = visibleContact(siteConfig.mapsUrl);
  if (maps) return maps;
  const addr = visibleContact(address);
  return addr
    ? `https://maps.google.com/?q=${encodeURIComponent(addr)}`
    : null;
}

/** Contacts map iframe src from owner pin or address. */
export function mapsEmbedHref(address = siteConfig.address): string | null {
  const embed = visibleContact(siteConfig.mapsEmbedSrc);
  if (embed) return embed;
  const addr = visibleContact(address);
  return addr
    ? `https://www.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`
    : null;
}

/** Build a dial link; Ukrainian 0XX… numbers get a +38 country code. */
export function telHref(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `tel:+38${digits}`;
  }
  if (digits.startsWith("380")) {
    return `tel:+${digits}`;
  }
  if (digits.length > 0) {
    return `tel:+${digits}`;
  }
  return `tel:${display.trim()}`;
}
