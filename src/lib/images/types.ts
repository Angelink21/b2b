import { z } from "zod";

export const modelImageEntrySchema = z.object({
  publicId: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Dimensions after e_trim, when available. */
  trimWidth: z.number().positive().optional(),
  trimHeight: z.number().positive().optional(),
});

export type ModelImageEntry = z.infer<typeof modelImageEntrySchema>;

export const imagesManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  cloudName: z.string(),
  folder: z.string(),
  /** Fixed container aspect when pixel size is unknown (unused when width/height set). */
  fallbackAspectRatio: z.string(),
  images: z.record(z.string(), modelImageEntrySchema),
  missingSlugs: z.array(z.string()),
});

export type ImagesManifest = z.infer<typeof imagesManifestSchema>;

export type ModelImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
  publicId: string;
  /** Value for next/image `src` with cloudinaryLoader (`cloudName::publicId`). */
  loaderSrc: string;
  trimWidth?: number;
  trimHeight?: number;
};

/** Fallback box ratio when Cloudinary dimensions are unavailable. */
export const IMAGE_FALLBACK_ASPECT_RATIO = "4 / 5";
