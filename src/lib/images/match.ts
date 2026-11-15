import {
  normalizeImageKey,
  stripCloudinaryUniqueTail,
  stripImageExtension,
} from "./normalize";

export type ImageMatchCandidate = {
  publicId: string;
  width: number;
  height: number;
};

export type ImageMatchResult =
  | { status: "exact"; candidate: ImageMatchCandidate }
  | { status: "ambiguous"; candidates: ImageMatchCandidate[] }
  | { status: "none" };

/**
 * Match a model to Cloudinary resources by normalized key.
 * Prefer `imageId` when provided. Strip unique tails only when needed.
 */
export function matchImageCandidate(
  opts: {
    imageKey: string;
    imageId?: string | null;
  },
  candidates: readonly ImageMatchCandidate[],
): ImageMatchResult {
  const preferred = opts.imageId?.trim() || opts.imageKey;
  const target = normalizeImageKey(preferred);

  const exact: ImageMatchCandidate[] = [];
  for (const c of candidates) {
    if (normalizeImageKey(c.publicId) === target) {
      exact.push(c);
    }
  }
  if (exact.length === 1) return { status: "exact", candidate: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact };

  const viaTail: ImageMatchCandidate[] = [];
  for (const c of candidates) {
    const stripped = stripCloudinaryUniqueTail(stripImageExtension(c.publicId));
    if (normalizeImageKey(stripped) === target) {
      viaTail.push(c);
    }
  }
  if (viaTail.length === 1) return { status: "exact", candidate: viaTail[0]! };
  if (viaTail.length > 1) return { status: "ambiguous", candidates: viaTail };

  return { status: "none" };
}
