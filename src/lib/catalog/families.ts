import { slugify } from "./parse";

/**
 * Trailing variant tokens from DATA_CONTRACT.
 * Longer tokens first so "NOMEX" / "HPi" / "HW" / "ES" beat single letters.
 * Sense of labels is not interpreted — storage only.
 */
export const VARIANT_TOKENS = [
  "NOMEX",
  "Nomex",
  "HPi",
  "HW",
  "ES",
  "XP",
  "E",
  "G",
  "P",
  "R",
  "S",
  "V",
] as const;

export type FamilyInfo = {
  familyId: string;
  familyBase: string;
  variantLabel: string | null;
};

function tokenEquals(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Peel known trailing tokens from the model name.
 * Example: "LAP-08 TP2 E V" → base "LAP-08 TP2", label "E V"
 */
export function deriveFamily(name: string): FamilyInfo {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const stripped: string[] = [];

  while (parts.length > 1) {
    const last = parts[parts.length - 1]!;
    const matched = VARIANT_TOKENS.find((token) => tokenEquals(token, last));
    if (!matched) break;
    stripped.unshift(parts.pop()!);
  }

  const familyBase = parts.join(" ");
  const familyId = slugify(familyBase);
  const variantLabel = stripped.length > 0 ? stripped.join(" ") : null;

  return { familyId, familyBase, variantLabel };
}
