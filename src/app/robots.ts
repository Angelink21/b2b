import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo/site-url";
import { routing } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();
  const disallow = [
    "/api/",
    ...routing.locales.flatMap((locale) => [
      `/${locale}/_styleguide`,
      `/${locale}/fontcheck`,
    ]),
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
