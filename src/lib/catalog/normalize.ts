import { deriveFamily } from "./families";
import {
  parseAirflowM3h,
  parseDimensionsMm,
  parseHeating,
  parseLoadKg,
  parseNoiseDb,
  parseOptionalNumber,
  parseOptionalRangeNumber,
  parsePowerKw,
  parseSectors,
  parseVoltage,
  parseVolumeL,
  parseWorkingSpeedMpm,
  slugify,
} from "./parse";
import {
  CATEGORY_BY_CSV,
  type CatalogIndexItem,
  type Product,
} from "./schema";

export type CsvRow = Record<string, string | undefined>;

export const CSV_COLUMNS = {
  name: "Назва моделі",
  category: "Тип обладнання",
  sectors: "Сфера застосування",
  loadKg: "Завантаження (кг)",
  volumeL: "Завантаження (л)",
  boilerL: "Бойлер (л)",
  powerKw: "Потужність (кВт)",
  boilerPowerKw: "Потужність бойлера (кВт)",
  gFactor: "G-фактор",
  spinRpm: "Віджим (об/хв)",
  shaftDiameterMm: "Діаметр валу (мм)",
  workingWidthMm: "Робоча ширина (мм)",
  workingSpeedMpm: "Робоча швидкість (м/хв)",
  dimensionsMm: "Габарити (ШхГхВ)",
  heating: "Тип нагріву",
  voltage: "Напруга живлення",
  exhaustMm: "Витяжка (мм)",
  airflowM3h: "Максимальний потік повітря (м3/год)",
  noiseDb: "Рівень шуму (дб)",
  shortDescription: "Короткий опис",
  fullDescription: "Повний опис",
  imageKey: "Зображення",
} as const;

function cell(row: CsvRow, key: keyof typeof CSV_COLUMNS): string {
  return (row[CSV_COLUMNS[key]] ?? "").trim();
}

export function isEmptyRow(row: CsvRow): boolean {
  return !cell(row, "name") && !cell(row, "category");
}

export type NormalizeResult = {
  product: Product;
  shortDescription: string;
  fullDescription: string;
};

/**
 * Normalize one CSV data row into a Product (+ raw descriptions for series).
 * Throws on unknown category or unparseable required dimensions.
 */
export function normalizeRow(
  row: CsvRow,
  seriesId: string,
): NormalizeResult {
  const name = cell(row, "name");
  if (!name) {
    throw new Error("Row missing model name");
  }

  const categoryCsv = cell(row, "category");
  const category = CATEGORY_BY_CSV[categoryCsv];
  if (!category) {
    throw new Error(`Unknown category: ${categoryCsv || "(empty)"}`);
  }

  const slug = slugify(name);
  const family = deriveFamily(name);
  const heatingParsed = parseHeating(cell(row, "heating"));
  const voltageParsed = parseVoltage(cell(row, "voltage"));
  const loadKg = parseLoadKg(cell(row, "loadKg"));
  const volumeL = parseVolumeL(cell(row, "volumeL"));
  const powerKw = parsePowerKw(cell(row, "powerKw"));
  const workingSpeedMpm = parseWorkingSpeedMpm(cell(row, "workingSpeedMpm"));
  const airflowM3h = parseAirflowM3h(cell(row, "airflowM3h"));
  const noiseDb = parseNoiseDb(cell(row, "noiseDb"));
  const dimensionsMm = parseDimensionsMm(cell(row, "dimensionsMm"));

  const product: Product = {
    id: slug,
    slug,
    name,
    category,
    familyId: family.familyId,
    variantLabel: family.variantLabel,
    seriesId,
    sectors: parseSectors(cell(row, "sectors")),
    loadKg,
    volumeL,
    boilerL: parseOptionalNumber(cell(row, "boilerL"), "boilerL"),
    powerKw,
    boilerPowerKw: parseOptionalRangeNumber(
      cell(row, "boilerPowerKw"),
      "boilerPowerKw",
    ),
    gFactor: parseOptionalNumber(cell(row, "gFactor"), "gFactor"),
    spinRpm: parseOptionalNumber(cell(row, "spinRpm"), "spinRpm"),
    shaftDiameterMm: parseOptionalNumber(
      cell(row, "shaftDiameterMm"),
      "shaftDiameterMm",
    ),
    workingWidthMm: parseOptionalNumber(
      cell(row, "workingWidthMm"),
      "workingWidthMm",
    ),
    workingSpeedMpm,
    dimensionsMm,
    heating: heatingParsed.heating,
    voltage: voltageParsed?.variants ?? null,
    voltageRaw: voltageParsed?.raw ?? null,
    exhaustMm: parseOptionalNumber(cell(row, "exhaustMm"), "exhaustMm"),
    airflowM3h,
    noiseDb,
    imageKey: cell(row, "imageKey"),
    image: null,
  };

  const imageId = (row["image_id"] ?? "").trim();
  if (imageId) {
    product.imageId = imageId;
  }

  if (heatingParsed.heatingVariant !== undefined) {
    product.heatingVariant = heatingParsed.heatingVariant;
  }

  return {
    product,
    shortDescription: cell(row, "shortDescription"),
    fullDescription: cell(row, "fullDescription"),
  };
}

export function toIndexItem(product: Product): CatalogIndexItem {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    heating: product.heating,
    loadKg: product.loadKg
      ? { min: product.loadKg.min, max: product.loadKg.max }
      : null,
    powerKwMax: product.powerKw?.max ?? null,
    dimensionsMm: {
      w: product.dimensionsMm.w,
      d: product.dimensionsMm.d,
      h: product.dimensionsMm.h,
    },
    familyId: product.familyId,
    variantLabel: product.variantLabel,
    volumeL: product.volumeL?.value ?? null,
    gFactor: product.gFactor,
    spinRpm: product.spinRpm,
    workingWidthMm: product.workingWidthMm,
    workingSpeedMpm: product.workingSpeedMpm
      ? {
          min: product.workingSpeedMpm.min,
          max: product.workingSpeedMpm.max,
        }
      : null,
    shaftDiameterMm: product.shaftDiameterMm,
  };
}
