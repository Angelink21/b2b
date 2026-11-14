import { siteConfig } from "@/config/site";
import type { Product } from "@/lib/catalog/schema";
import { getModelImage } from "@/lib/images";

import { absoluteUrl, type LocalePath } from "./paths";
import { getSiteUrl } from "./site-url";

export type JsonLd = Record<string, unknown>;

const FORBIDDEN_TOP_KEYS = [
  "offers",
  "aggregateRating",
  "review",
  "price",
  "priceCurrency",
  "address",
  "telephone",
  "email",
] as const;

export function assertNoInventedFields(node: unknown, path = "$"): string[] {
  const errors: string[] = [];
  if (node === null || typeof node !== "object") return errors;
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      errors.push(...assertNoInventedFields(item, `${path}[${i}]`));
    });
    return errors;
  }
  const obj = node as Record<string, unknown>;
  for (const key of FORBIDDEN_TOP_KEYS) {
    if (key in obj) {
      errors.push(`${path}.${key} must not be invented`);
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === "@context" || key === "@type" || key === "@id") continue;
    errors.push(...assertNoInventedFields(value, `${path}.${key}`));
  }
  return errors;
}

export function organizationJsonLd(): JsonLd {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${getSiteUrl()}/#organization`,
    name: siteConfig.name,
  };
  const url = siteConfig.url;
  if (url) {
    data.url = url;
  }
  return data;
}

export function webSiteJsonLd(locale: string): JsonLd {
  const url = absoluteUrl(locale, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name: siteConfig.name,
    url,
    inLanguage: locale,
    publisher: {
      "@id": `${getSiteUrl()}/#organization`,
    },
  };
}

export type BreadcrumbItem = {
  name: string;
  path: LocalePath;
};

export function breadcrumbListJsonLd(
  locale: string,
  items: readonly BreadcrumbItem[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}

export type ItemListEntry = {
  name: string;
  path: LocalePath;
};

export function itemListJsonLd(
  locale: string,
  name: string,
  entries: readonly ItemListEntry[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      url: absoluteUrl(locale, entry.path),
    })),
  };
}

export type ProductJsonLdLabels = {
  category: string;
  heating: string | null;
  propertyNames: {
    loadKg: string;
    powerKw: string;
    dimensionsMm: string;
    heating: string;
    volumeL: string;
    workingWidthMm: string;
    spinRpm: string;
    gFactor: string;
    voltage: string;
  };
};

function propertyValue(
  name: string,
  value: string | number,
): { "@type": "PropertyValue"; name: string; value: string | number } {
  return { "@type": "PropertyValue", name, value };
}

export function productJsonLd(
  locale: string,
  product: Product,
  labels: ProductJsonLdLabels,
): JsonLd {
  const path: LocalePath = `/catalog/${product.category}/${product.slug}`;
  const additionalProperty: ReturnType<typeof propertyValue>[] = [];

  if (product.loadKg) {
    additionalProperty.push(
      propertyValue(labels.propertyNames.loadKg, product.loadKg.raw),
    );
  }
  if (labels.heating) {
    additionalProperty.push(
      propertyValue(labels.propertyNames.heating, labels.heating),
    );
  }
  if (product.powerKw) {
    additionalProperty.push(
      propertyValue(labels.propertyNames.powerKw, product.powerKw.raw),
    );
  }
  if (product.volumeL) {
    additionalProperty.push(
      propertyValue(labels.propertyNames.volumeL, product.volumeL.raw),
    );
  }
  if (product.workingWidthMm != null) {
    additionalProperty.push(
      propertyValue(
        labels.propertyNames.workingWidthMm,
        product.workingWidthMm,
      ),
    );
  }
  if (product.spinRpm != null) {
    additionalProperty.push(
      propertyValue(labels.propertyNames.spinRpm, product.spinRpm),
    );
  }
  if (product.gFactor != null) {
    additionalProperty.push(
      propertyValue(labels.propertyNames.gFactor, product.gFactor),
    );
  }
  if (product.voltageRaw || (product.voltage && product.voltage.length > 0)) {
    additionalProperty.push(
      propertyValue(
        labels.propertyNames.voltage,
        product.voltageRaw ?? product.voltage!.join(", "),
      ),
    );
  }
  additionalProperty.push(
    propertyValue(
      labels.propertyNames.dimensionsMm,
      `${product.dimensionsMm.w}×${product.dimensionsMm.d}×${product.dimensionsMm.h}`,
    ),
  );

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.slug,
    category: labels.category,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    url: absoluteUrl(locale, path),
    additionalProperty,
  };

  const photo = getModelImage(product);
  if (photo?.url) {
    data.image = photo.url;
  }

  return data;
}

/** Serialize for <script type="application/ld+json"> — escapes </ to avoid HTML breakout. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
