import { afterEach, describe, expect, it } from "vitest";

import { getEnv, parseGtmId, resetEnvCache } from "@/env";

const KEYS = [
  "GOOGLE_SITE_VERIFICATION",
  "BING_SITE_VERIFICATION",
  "NEXT_PUBLIC_GTM_ID",
] as const;

const original: Record<(typeof KEYS)[number], string | undefined> = {
  GOOGLE_SITE_VERIFICATION: undefined,
  BING_SITE_VERIFICATION: undefined,
  NEXT_PUBLIC_GTM_ID: undefined,
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
  resetEnvCache();
});

describe("parseGtmId", () => {
  it("accepts GTM ids case-insensitively", () => {
    expect(parseGtmId("gtm-abc12")).toBe("GTM-ABC12");
    expect(parseGtmId(" GTM-XYZ9 ")).toBe("GTM-XYZ9");
  });

  it("rejects empty or malformed values", () => {
    expect(parseGtmId(undefined)).toBeNull();
    expect(parseGtmId("")).toBeNull();
    expect(parseGtmId("AW-123")).toBeNull();
    expect(parseGtmId("G-XXXX")).toBeNull();
  });
});

describe("getEnv marketing slots", () => {
  it("exposes trimmed verification and gtm helpers", () => {
    for (const key of KEYS) {
      original[key] = process.env[key];
    }
    writeEnv("GOOGLE_SITE_VERIFICATION", " google-token ");
    writeEnv("BING_SITE_VERIFICATION", "bing-token");
    writeEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST1");
    resetEnvCache();

    const env = getEnv();
    expect(env.googleSiteVerification).toBe("google-token");
    expect(env.bingSiteVerification).toBe("bing-token");
    expect(env.gtmId).toBe("GTM-TEST1");
  });
});
