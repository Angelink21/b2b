import { describe, expect, it } from "vitest";

import { getSnapshotAll as getAll, getSnapshotByCategory as getByCategory } from "@/lib/catalog";
import {
  aboutPageJsonLd,
  assertNoInventedFields,
  breadcrumbListJsonLd,
  contactPageJsonLd,
  itemListJsonLd,
  organizationJsonLd,
  productJsonLd,
  serializeJsonLd,
  webSiteJsonLd,
} from "./json-ld";

describe("JSON-LD builders (S3)", () => {
  it("Organization uses owner-confirmed phone/email/address", () => {
    const data = organizationJsonLd();
    expect(data["@type"]).toBe("Organization");
    expect(assertNoInventedFields(data)).toEqual([]);
    expect(data.name).toBe("Fagor Professional");
    expect(data.telephone).toEqual(["044-501-88-87", "050-382-48-78"]);
    expect(data.email).toBe("pkmprofessional@ukr.net");
    expect(data.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "вулиця Київська, 27-В, Вишневе, Київська область",
      addressCountry: "UA",
    });
  });

  it("AboutPage and ContactPage omit invented contacts", () => {
    const about = aboutPageJsonLd("uk");
    const contact = contactPageJsonLd("en");
    expect(about["@type"]).toBe("AboutPage");
    expect(contact["@type"]).toBe("ContactPage");
    expect(assertNoInventedFields(about)).toEqual([]);
    expect(assertNoInventedFields(contact)).toEqual([]);
    expect(about.telephone).toBeUndefined();
    expect(contact.email).toBeUndefined();
  });

  it("WebSite links to Organization without offers or ratings", () => {
    const data = webSiteJsonLd("uk");
    expect(data["@type"]).toBe("WebSite");
    expect(assertNoInventedFields(data)).toEqual([]);
  });

  it("BreadcrumbList positions are 1-based and sequential", () => {
    const data = breadcrumbListJsonLd("uk", [
      { name: "Каталог", path: "/catalog" },
      { name: "Пральні", path: "/catalog/washers" },
    ]);
    const items = data.itemListElement as Array<{ position: number }>;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(assertNoInventedFields(data)).toEqual([]);
  });

  it("ItemList covers every product in a category", () => {
    const products = getByCategory("washers");
    const data = itemListJsonLd(
      "uk",
      "Пральні машини",
      products.map((p) => ({
        name: p.name,
        path: `/catalog/${p.category}/${p.slug}`,
      })),
    );
    expect(data.numberOfItems).toBe(products.length);
    expect(assertNoInventedFields(data)).toEqual([]);
  });

  it("Product JSON-LD uses specs only; image omitted without photo", () => {
    const product = getAll().find((p) => p.slug.length > 0);
    expect(product).toBeDefined();
    const data = productJsonLd("uk", product!, {
      category: "Пральні машини",
      heating: "Електричний",
      propertyNames: {
        loadKg: "Завантаження",
        powerKw: "Потужність",
        dimensionsMm: "Габарити",
        heating: "Нагрів",
        volumeL: "Об’єм",
        workingWidthMm: "Ширина",
        spinRpm: "Віджим",
        gFactor: "G",
        voltage: "Напруга",
      },
    });
    expect(data["@type"]).toBe("Product");
    // Image only when sync found a Cloudinary asset for the model.
    if (data.image !== undefined) {
      expect(typeof data.image).toBe("string");
      expect(String(data.image)).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    }
    expect(data.offers).toBeUndefined();
    expect(data.aggregateRating).toBeUndefined();
    expect(assertNoInventedFields(data)).toEqual([]);
    expect(Array.isArray(data.additionalProperty)).toBe(true);
  });

  it("serializeJsonLd escapes < to avoid script breakout", () => {
    const raw = serializeJsonLd({ name: "a</script>b" });
    expect(raw).toContain("\\u003c");
    expect(raw).not.toContain("</script>");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("every built graph parses as JSON", () => {
    const product = getAll()[0]!;
    const graphs = [
      organizationJsonLd(),
      webSiteJsonLd("en"),
      breadcrumbListJsonLd("en", [{ name: "Catalog", path: "/catalog" }]),
      itemListJsonLd("en", "Washers", [
        { name: product.name, path: `/catalog/${product.category}/${product.slug}` },
      ]),
      productJsonLd("en", product, {
        category: "Washers",
        heating: null,
        propertyNames: {
          loadKg: "Load",
          powerKw: "Power",
          dimensionsMm: "Dimensions",
          heating: "Heating",
          volumeL: "Volume",
          workingWidthMm: "Width",
          spinRpm: "Spin",
          gFactor: "G",
          voltage: "Voltage",
        },
      }),
    ];
    for (const graph of graphs) {
      const parsed = JSON.parse(serializeJsonLd(graph)) as unknown;
      expect(parsed).toBeTruthy();
      expect(assertNoInventedFields(parsed)).toEqual([]);
    }
  });
});
