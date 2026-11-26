import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import {
  absoluteUrl,
  languageAlternates,
  type LocalePath,
} from "./paths";
import { getSiteUrl } from "./site-url";

export function metadataBaseUrl(): URL {
  return new URL(getSiteUrl());
}

export type SiteVerificationInput = {
  google?: string | null;
  bing?: string | null;
};

/** Search Console / Bing HTML meta tags. Omit empty values. */
export function buildSiteVerification(
  input: SiteVerificationInput,
): Metadata["verification"] | undefined {
  const google = input.google?.trim();
  const bing = input.bing?.trim();
  if (!google && !bing) return undefined;

  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

export type PageMetaInput = {
  locale: string;
  /** Path without locale, e.g. "" or "/catalog/washers". */
  path: LocalePath;
  title: string;
  description: string;
  robots?: Metadata["robots"];
  ogType?: "website" | "article";
};

/** Shared metadata: unique title/description, canonical, hreflang. */
export function buildPageMetadata(input: PageMetaInput): Metadata {
  const canonical = absoluteUrl(input.locale, input.path);
  const ogLocale = input.locale === "uk" ? "uk_UA" : "en_US";

  const title =
    input.path === ""
      ? { absolute: input.title }
      : input.title;

  return {
    title,
    description: input.description,
    alternates: {
      canonical,
      languages: languageAlternates(input.path),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: ogLocale,
      type: input.ogType ?? "website",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
    robots: input.robots,
  };
}
