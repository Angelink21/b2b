import { z } from "zod";

export const CATEGORY_SLUGS = [
  "washers",
  "dryers",
  "flatwork-ironers",
  "laundry-carts",
  "ironing-rollers",
  "finishing",
  "water-recovery",
  "washer-dryers",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_BY_CSV: Readonly<Record<string, CategorySlug>> = {
  "Пральні машини": "washers",
  "Сушильні машини": "dryers",
  "Прасувальні каландри": "flatwork-ironers",
  "Візки для пральні": "laundry-carts",
  "Прасувальні катки": "ironing-rollers",
  "Фінішна обробка": "finishing",
  "Система регенерації води": "water-recovery",
  "Прально-сушильне обладнання": "washer-dryers",
};

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

export const seriesSchema = z.object({
  id: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  fullBullets: z.array(z.string()),
});

export type Series = z.infer<typeof seriesSchema>;

export const productSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: z.enum(CATEGORY_SLUGS),
  familyId: z.string(),
  variantLabel: z.string().nullable(),
  seriesId: z.string(),
  sectors: z.array(z.enum(SECTOR_KEYS)),
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
  category: z.enum(CATEGORY_SLUGS),
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
