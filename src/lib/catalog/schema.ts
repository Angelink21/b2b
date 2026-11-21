import { z } from "zod";

import {
  CATEGORY_BY_CSV,
  CATEGORY_SLUGS,
  type CategorySlug,
} from "@/config/categories";

export { CATEGORY_BY_CSV, CATEGORY_SLUGS, type CategorySlug };
export { isCategorySlug } from "@/config/categories";

export const SECTOR_KEYS = [
  "hospitals",
  "hospitality",
  "social",
  "industrial",
  "laundries",
] as const;

export type SectorKey = (typeof SECTOR_KEYS)[number];

export const SECTOR_BY_CSV: Readonly<Record<string, SectorKey>> = {
  "Лікарні та медичні центри": "hospitals",
  "Готелі, хостели та ресторани": "hospitality",
  "Соціальні заклади": "social",
  "Промислові підприємства та фабрики": "industrial",
  "Пральні та пральні самообслуговування": "laundries",
};

export const HEATING_KEYS = [
  "electric",
  "steam",
  "gas",
  "hot-water",
  "combined",
] as const;

export type HeatingKey = (typeof HEATING_KEYS)[number];

export const loadKgSchema = z.object({
  raw: z.string(),
  min: z.number(),
  max: z.number(),
  multiplier: z.number().optional(),
});

export const powerKwSchema = z.object({
  raw: z.string(),
  max: z.number(),
  alt: z.number().optional(),
});

export const dimensionsMmSchema = z.object({
  w: z.number(),
  d: z.number(),
  h: z.number(),
  note: z.string().optional(),
});

export const noiseDbSchema = z.object({
  value: z.number(),
  lessThan: z.boolean().optional(),
  alt: z.number().optional(),
});

export const volumeLSchema = z.object({
  raw: z.string(),
  value: z.number(),
  multiplier: z.number().optional(),
});

export const rangeNumberSchema = z.object({
  raw: z.string(),
  min: z.number(),
  max: z.number(),
});

export const airflowSchema = z.object({
  raw: z.string(),
  value: z.number(),
  multiplier: z.number().optional(),
});

export const descriptionBlockSchema = z.object({
  kind: z.enum(["heading", "bullet"]),
  text: z.string(),
});

export type DescriptionBlock = z.infer<typeof descriptionBlockSchema>;

export const seriesSchema = z.object({
  id: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  fullBullets: z.array(z.string()),
  /** Present after rebuild; older snapshots omit this. */
  fullBlocks: z.array(descriptionBlockSchema).optional(),
});

export type Series = z.infer<typeof seriesSchema>;

const categoryEnum = z.enum(CATEGORY_SLUGS);

export const productSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  name: z.string(),
  category: categoryEnum,
  familyId: z.string(),
  variantLabel: z.string().nullable(),
  seriesId: z.string(),
  sectors: z.array(z.enum(SECTOR_KEYS)),
  /** Free-text sector labels from the sheet (not used as filters). */
  sectorLabels: z.array(z.string()).optional(),
  loadKg: loadKgSchema.nullable(),
  volumeL: volumeLSchema.nullable(),
  boilerL: z.number().nullable(),
  powerKw: powerKwSchema.nullable(),
  boilerPowerKw: rangeNumberSchema.nullable(),
  gFactor: z.number().nullable(),
  spinRpm: z.number().nullable(),
  shaftDiameterMm: z.number().nullable(),
  workingWidthMm: z.number().nullable(),
  workingSpeedMpm: rangeNumberSchema.nullable(),
  dimensionsMm: dimensionsMmSchema,
  heating: z.enum(HEATING_KEYS).nullable(),
  heatingVariant: z.string().optional(),
  voltage: z.array(z.string()).nullable(),
  voltageRaw: z.string().nullable(),
  exhaustMm: z.number().nullable(),
  airflowM3h: airflowSchema.nullable(),
  noiseDb: noiseDbSchema.nullable(),
  imageKey: z.string(),
  /** Optional explicit Cloudinary / sheet image id (CSV column `image_id`). */
  imageId: z.string().optional(),
  image: z.null(),
});

export type Product = z.infer<typeof productSchema>;

export const catalogIndexItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: categoryEnum,
  heating: z.enum(HEATING_KEYS).nullable(),
  loadKg: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .nullable(),
  powerKwMax: z.number().nullable(),
  dimensionsMm: z.object({
    w: z.number(),
    d: z.number(),
    h: z.number(),
  }),
  familyId: z.string(),
  variantLabel: z.string().nullable(),
  volumeL: z.number().nullable(),
  gFactor: z.number().nullable(),
  spinRpm: z.number().nullable(),
  workingWidthMm: z.number().nullable(),
  workingSpeedMpm: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .nullable(),
  shaftDiameterMm: z.number().nullable(),
});

export type CatalogIndexItem = z.infer<typeof catalogIndexItemSchema>;

export const catalogGeneratedSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  products: z.array(productSchema),
  series: z.array(seriesSchema),
});

export type CatalogGenerated = z.infer<typeof catalogGeneratedSchema>;

export const catalogIndexSchema = z.object({
  version: z.literal(1),
  products: z.array(catalogIndexItemSchema),
});

export type CatalogIndex = z.infer<typeof catalogIndexSchema>;
