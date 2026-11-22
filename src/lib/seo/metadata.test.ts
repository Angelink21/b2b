import { afterEach, describe, expect, it } from "vitest";

import { buildPageMetadata } from "./metadata";
import { absoluteUrl } from "./paths";
import { getSiteUrl } from "./site-url";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
  "NODE_ENV",
] as const;

const original: Record<(typeof KEYS)[number], string | undefined> = {
  NEXT_PUBLIC_SITE_URL: undefined,
  VERCEL_ENV: undefined,
  VERCEL_PROJECT_PRODUCTION_URL: undefined,
  VERCEL_URL: undefined,
  NODE_ENV: undefined,
};

function writeEnv(key: (typeof KEYS)[number], value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

afterEach(() => {
  for (const key of KEYS) {
    writeEnv(key, original[key]);
  }
});

describe("production metadata URLs", () => {
  it("contains no localhost when VERCEL_ENV=production", () => {
    for (const key of KEYS) {
      original[key] = process.env[key];
      writeEnv(key, undefined);
    }
    writeEnv("VERCEL_ENV", "production");
    writeEnv("NODE_ENV", "production");
    writeEnv("VERCEL_PROJECT_PRODUCTION_URL", "pralne-obladnannya.com.ua");

    const origin = getSiteUrl();
    const canonical = absoluteUrl("uk", "/catalog");
    const meta = buildPageMetadata({
      locale: "uk",
      path: "/catalog",
      title: "Catalog",
      description: "Desc",
    });

    expect(origin).not.toMatch(/localhost/i);
    expect(canonical).not.toMatch(/localhost/i);
    expect(String(meta.alternates?.canonical)).not.toMatch(/localhost/i);
    expect(String(meta.openGraph?.url)).not.toMatch(/localhost/i);
  });
});
