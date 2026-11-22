import type { RotationQuarter } from "./geometry";

/** Compact floor-plan payload stored in the URL hash as `#fp=…`. */
export const PLAN_HASH_KEY = "fp";

export type PlanMachineHash = {
  s: string;
  x: number;
  y: number;
  r: RotationQuarter;
};

export type PlanHashPayload = {
  v: 1;
  w: number;
  l: number;
  g: number;
  m: PlanMachineHash[];
  h?: string[];
};

function toBase64Url(text: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const b64 = padded + pad;
    if (typeof Buffer !== "undefined") {
      return Buffer.from(b64, "base64").toString("utf8");
    }
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function isRotation(value: unknown): value is RotationQuarter {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

export function encodePlanPayload(payload: PlanHashPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodePlanPayload(encoded: string): PlanHashPayload | null {
  const json = fromBase64Url(encoded);
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    if (obj.v !== 1) return null;
    if (typeof obj.w !== "number" || !(obj.w > 0)) return null;
    if (typeof obj.l !== "number" || !(obj.l > 0)) return null;
    if (typeof obj.g !== "number" || obj.g < 0) return null;
    if (!Array.isArray(obj.m)) return null;
    const machines: PlanMachineHash[] = [];
    for (const item of obj.m) {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.s !== "string" || row.s.length === 0) return null;
      if (typeof row.x !== "number" || typeof row.y !== "number") return null;
      if (!isRotation(row.r)) return null;
      machines.push({ s: row.s, x: row.x, y: row.y, r: row.r });
    }
    let hidden: string[] | undefined;
    if (obj.h !== undefined) {
      if (!Array.isArray(obj.h) || !obj.h.every((s) => typeof s === "string")) {
        return null;
      }
      hidden = obj.h as string[];
    }
    const payload: PlanHashPayload = {
      v: 1,
      w: obj.w,
      l: obj.l,
      g: obj.g,
      m: machines,
    };
    if (hidden && hidden.length > 0) {
      payload.h = hidden;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Read `#fp=…` (or `fp` query-less hash segment) from a location hash string. */
export function parsePlanHash(hash: string): PlanHashPayload | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const encoded = params.get(PLAN_HASH_KEY);
  if (!encoded) return null;
  return decodePlanPayload(encoded);
}

export function buildPlanHash(payload: PlanHashPayload): string {
  return `#${PLAN_HASH_KEY}=${encodePlanPayload(payload)}`;
}

export function planPayloadFromState(input: {
  roomWidthM: number;
  roomLengthM: number;
  gapMm: number;
  placements: Record<
    string,
    { xMm: number; yMm: number; rotation: RotationQuarter }
  >;
  hiddenSlugs: readonly string[];
}): PlanHashPayload {
  const machines: PlanMachineHash[] = Object.entries(input.placements).map(
    ([slug, state]) => ({
      s: slug,
      x: state.xMm,
      y: state.yMm,
      r: state.rotation,
    }),
  );
  const payload: PlanHashPayload = {
    v: 1,
    w: input.roomWidthM,
    l: input.roomLengthM,
    g: input.gapMm,
    m: machines,
  };
  if (input.hiddenSlugs.length > 0) {
    payload.h = [...input.hiddenSlugs];
  }
  return payload;
}
