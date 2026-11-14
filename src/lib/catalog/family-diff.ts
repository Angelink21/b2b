import type { Product } from "./schema";
import {
  formatDimensionsMm,
  formatLoadKg,
  formatPowerKw,
  formatVoltage,
} from "./format";

export type FamilyDiffField =
  | "variantLabel"
  | "heating"
  | "heatingVariant"
  | "powerKw"
  | "loadKg"
  | "voltage"
  | "dimensionsMm"
  | "name";

export type FamilyMemberSummary = {
  slug: string;
  name: string;
  category: Product["category"];
  variantLabel: string | null;
  /** Field keys that differ from the current product. */
  differingFields: FamilyDiffField[];
};

function fingerprint(product: Product): Record<FamilyDiffField, string> {
  return {
    variantLabel: product.variantLabel ?? "",
    heating: product.heating ?? "",
    heatingVariant: product.heatingVariant ?? "",
    powerKw: product.powerKw ? formatPowerKw(product.powerKw) : "",
    loadKg: product.loadKg ? formatLoadKg(product.loadKg) : "",
    voltage: formatVoltage(product.voltage, product.voltageRaw),
    dimensionsMm: formatDimensionsMm(product.dimensionsMm),
    name: product.name,
  };
}

const COMPARE_FIELDS: FamilyDiffField[] = [
  "variantLabel",
  "heating",
  "heatingVariant",
  "powerKw",
  "loadKg",
  "voltage",
  "dimensionsMm",
];

/**
 * Summarize family members and which fields differ from `current`.
 * Order: current first, then others by name.
 */
export function summarizeFamily(
  current: Product,
  family: readonly Product[],
): FamilyMemberSummary[] {
  const currentFp = fingerprint(current);
  const others = family
    .filter((p) => p.slug !== current.slug)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "uk"));

  const ordered = [current, ...others];

  return ordered.map((product) => {
    const fp = fingerprint(product);
    const differingFields: FamilyDiffField[] = [];
    if (product.slug !== current.slug) {
      for (const field of COMPARE_FIELDS) {
        if (fp[field] !== currentFp[field]) {
          differingFields.push(field);
        }
      }
    }
    return {
      slug: product.slug,
      name: product.name,
      category: product.category,
      variantLabel: product.variantLabel,
      differingFields,
    };
  });
}
