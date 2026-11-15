/**
 * Normalize image keys / Cloudinary public_ids for matching.
 * Spaces, underscores, and hyphens are equivalent; case-insensitive; NFC; trim.
 */

const EXT_RE = /\.(png|webp|jpe?g)$/i;
/** Cloudinary unique-filename suffix: _ + 6 alphanumeric chars at end of last segment. */
const CLOUDINARY_TAIL_RE = /_([a-zA-Z0-9]{6})$/;

export function stripImageExtension(value: string): string {
  return value.replace(EXT_RE, "");
}

export function normalizeImageKey(value: string): string {
  const trimmed = value.normalize("NFC").trim();
  const base = stripImageExtension(trimmed);
  // Match on the last path segment so folder prefixes do not block hits.
  const leaf = base.includes("/") ? (base.split("/").pop() ?? base) : base;
  return leaf.toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Drop Cloudinary's random unique-filename tail (_xxxxxx) from a public_id.
 * Only the last path segment is considered.
 */
export function stripCloudinaryUniqueTail(publicId: string): string {
  const parts = publicId.split("/");
  const last = parts[parts.length - 1] ?? publicId;
  const stripped = last.replace(CLOUDINARY_TAIL_RE, "");
  if (stripped === last) return publicId;
  parts[parts.length - 1] = stripped;
  return parts.join("/");
}

/**
 * Build delivery public_id from CSV imageKey (or image_id):
 * strip extension, replace spaces with underscores, optional folder prefix.
 */
export function imageKeyToPublicId(
  imageKey: string,
  folder = "",
): string {
  const base = stripImageExtension(imageKey).trim().replace(/ /g, "_");
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  return cleanFolder ? `${cleanFolder}/${base}` : base;
}

export function encodeCloudinaryPath(publicId: string): string {
  return publicId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
