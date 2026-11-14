import { siteConfig } from "@/config/site";

/** Absolute site origin for canonical, sitemap, OG. Falls back for local/CI. */
export function getSiteUrl(): string {
  return siteConfig.url ?? "http://localhost:3000";
}
