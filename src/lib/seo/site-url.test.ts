import { afterEach, describe, expect, it } from "vitest";

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

function readEnv(key: (typeof KEYS)[number]): string | undefined {
  return process.env[key];
}

function writeEnv(key: (typeof KEYS)[number], value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function stashEnv() {
  for (const key of KEYS) {
    original[key] = readEnv(key);
  }
}

function restoreEnv() {
  for (const key of KEYS) {
    writeEnv(key, original[key]);
  }
}

function clearSiteEnv() {
  for (const key of KEYS) {
    writeEnv(key, undefined);
  }
}

afterEach(() => {
  restoreEnv();
});

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    stashEnv();
    clearSiteEnv();
    writeEnv("NEXT_PUBLIC_SITE_URL", "https://fagorlaundry.com.ua/");
    writeEnv("VERCEL_ENV", "production");
    writeEnv("VERCEL_PROJECT_PRODUCTION_URL", "other.vercel.app");
    expect(getSiteUrl()).toBe("https://fagorlaundry.com.ua");
  });

  it("uses VERCEL_PROJECT_PRODUCTION_URL in production without localhost", () => {
    stashEnv();
    clearSiteEnv();
    writeEnv("VERCEL_ENV", "production");
    writeEnv("NODE_ENV", "production");
    writeEnv("VERCEL_PROJECT_PRODUCTION_URL", "fagorlaundry.com.ua");
    const url = getSiteUrl();
    expect(url).toBe("https://fagorlaundry.com.ua");
    expect(url).not.toMatch(/localhost/i);
  });

  it("uses VERCEL_URL in preview", () => {
    stashEnv();
    clearSiteEnv();
    writeEnv("VERCEL_ENV", "preview");
    writeEnv("VERCEL_URL", "fagor-git-main.vercel.app");
    expect(getSiteUrl()).toBe("https://fagor-git-main.vercel.app");
  });

  it("falls back to localhost only outside production", () => {
    stashEnv();
    clearSiteEnv();
    writeEnv("NODE_ENV", "development");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("throws in production when no URL is configured", () => {
    stashEnv();
    clearSiteEnv();
    writeEnv("VERCEL_ENV", "production");
    writeEnv("NODE_ENV", "production");
    expect(() => getSiteUrl()).toThrow(/Production site URL is missing/);
  });
});
