import { getEnv } from "@/env";

export async function verifyTurnstile(
  token: string,
  ip: string,
): Promise<boolean> {
  const env = getEnv();
  if (!env.turnstileEnabled) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams();
    body.set("secret", env.TURNSTILE_SECRET_KEY ?? "");
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch {
    return false;
  }
}
