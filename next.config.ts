import fs from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { toNextRedirects, type SlugHistoryFile } from "./src/lib/catalog/slug-history";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();

function loadSlugRedirects() {
  const historyPath = path.join(__dirname, "src/data/slug-history.json");
  if (!fs.existsSync(historyPath)) return [];
  try {
    const history = JSON.parse(
      fs.readFileSync(historyPath, "utf8"),
    ) as SlugHistoryFile;
    return toNextRedirects(history);
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // HTML is rewritten by scripts/start-server.mjs; that server gzips documents itself.
  compress: false,
  // e2e sets NEXT_DIST_DIR so `pnpm build` does not share `.next` with `pnpm dev`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  cacheComponents: true,
  partialPrefetching: true,
  // Custom loader on <Image> returns absolute Cloudinary URLs; remotePatterns
  // still required if src is ever an absolute res.cloudinary.com URL.
  images: {
    ...(cloudinaryCloudName
      ? {
          remotePatterns: [
            {
              protocol: "https",
              hostname: "res.cloudinary.com",
              pathname: `/${cloudinaryCloudName}/**`,
            },
          ],
        }
      : {}),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers: security }];
  },
  async redirects() {
    // 301 from renamed model slugs (imageKey / image_id identity).
    return loadSlugRedirects();
  },
};

export default withNextIntl(nextConfig);
