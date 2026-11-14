import { createHash } from "node:crypto";

import { getEnv } from "@/env";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();
let loggedInMemory = false;

function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function memoryAllow(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  if (existing.count >= max) {
    return { allowed: false, remaining: 0 };
  }
  existing.count += 1;
  return { allowed: true, remaining: max - existing.count };
}

async function upstashAllow(
  key: string,
  max: number,
  windowMs: number,
  url: string,
  token: string,
): Promise<{ allowed: boolean; remaining: number } | null> {
  const redisKey = `leads:rl:${key}`;
  try {
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = incrJson.result ?? 0;
    if (count === 1) {
      await fetch(
        `${url}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(2500),
        },
      );
    }
    return { allowed: count <= max, remaining: Math.max(0, max - count) };
  } catch {
    return null;
  }
}

/** Rate-limit by hashed IP. Prefer Upstash when configured; else in-memory. */
export async function checkLeadRateLimit(
  ip: string,
): Promise<{ allowed: boolean; backend: "upstash" | "memory" }> {
  const env = getEnv();
  const key = hashIp(ip || "unknown", env.rateSalt);

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const result = await upstashAllow(
      key,
      env.rateLimitMax,
      env.rateLimitWindowMs,
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN,
    );
    if (result) {
      return { allowed: result.allowed, backend: "upstash" };
    }
  }

  if (!loggedInMemory) {
    loggedInMemory = true;
    console.info(
      JSON.stringify({
        kind: "leads-rate-limit",
        backend: "memory",
        note: "Upstash env missing or failed; using in-memory limiter",
      }),
    );
  }

  const result = memoryAllow(key, env.rateLimitMax, env.rateLimitWindowMs);
  return { allowed: result.allowed, backend: "memory" };
}

/** Test helper. */
export function resetRateLimitMemory(): void {
  memoryBuckets.clear();
  loggedInMemory = false;
}
