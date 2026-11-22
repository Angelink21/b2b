/**
 * Absolute site origin for canonical, sitemap, OG, JSON-LD.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL (explicit)
 * 2. Vercel Production → https://VERCEL_PROJECT_PRODUCTION_URL
 * 3. Vercel Preview → https://VERCEL_URL
 * 4. localhost only outside production builds
 *
 * A production build without an explicit / Vercel production URL throws.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function asHttpsHost(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return stripTrailingSlash(trimmed);
  }
  return `https://${stripTrailingSlash(trimmed)}`;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") {
    const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (productionHost) {
      return asHttpsHost(productionHost);
    }
    throw new Error(
      "Production site URL is missing. Set NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL.",
    );
  }

  if (vercelEnv === "preview") {
    const previewHost = process.env.VERCEL_URL?.trim();
    if (previewHost) {
      return asHttpsHost(previewHost);
    }
  }

  // `next build` / `next start` set NODE_ENV=production even off Vercel.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Production site URL is missing. Set NEXT_PUBLIC_SITE_URL (or VERCEL_PROJECT_PRODUCTION_URL when VERCEL_ENV=production).",
    );
  }

  return "http://localhost:3000";
}
