import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DimensionDrawing } from "@/components/ui/DimensionDrawing";
import { Field, fieldAria } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ModelImage } from "@/components/ui/ModelImage";
import { Row, RowList } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { Select } from "@/components/ui/Select";
import { Silhouette } from "@/components/ui/Silhouette";
import { SpecList } from "@/components/ui/SpecList";
import { Stat } from "@/components/ui/Stat";
import { Textarea } from "@/components/ui/Textarea";
import {
  StyleguideChips,
  StyleguideRange,
  StyleguideTable,
} from "@/components/styleguide/StyleguideDemos";
import type { Product } from "@/lib/catalog/schema";

function styleguideAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ENABLE_STYLEGUIDE === "1";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("styleguideTitle"),
    robots: { index: false, follow: false },
  };
}

const DEMO_PRODUCT = {
  slug: "lap-08-tp2-e",
  name: "LAP-08 TP2 E",
  category: "washers",
  imageKey: "LAP-08 TP2 E.png",
  image: null,
  dimensionsMm: { w: 686, d: 829, h: 1019 },
} as const satisfies Pick<
  Product,
  "slug" | "name" | "category" | "imageKey" | "image" | "dimensionsMm"
>;

export default async function StyleguidePage() {
  if (!styleguideAllowed()) {
    notFound();
  }

  const t = await getTranslations("styleguide");
  const nameAria = fieldAria("sg-name", {
    hint: t("fieldHint"),
    error: t("fieldError"),
  });
  const companyAria = fieldAria("sg-company", {});
  const siteAria = fieldAria("sg-site", {});
  const commentAria = fieldAria("sg-comment", {});

  return (
    <Container className="py-12">
      <h1>{t("title")}</h1>
      <p className="styleguide-intro mt-6 text-steel">{t("intro")}</p>

      <section className="styleguide-block" data-sg="buttons" aria-labelledby="sg-buttons">
        <h2 id="sg-buttons">{t("buttons")}</h2>
        <div className="styleguide-row">
          <Button variant="primary">{t("primary")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="link">{t("link")}</Button>
          <Button variant="primary" size="sm">
            {t("primary")}
          </Button>
          <Button variant="secondary" size="sm" disabled>
            {t("disabled")}
          </Button>
          <Button variant="primary" loading>
            {t("loading")}
          </Button>
        </div>
      </section>

      <section className="styleguide-block" data-sg="chips" aria-labelledby="sg-chips">
        <h2 id="sg-chips">{t("chips")}</h2>
        <StyleguideChips />
      </section>

      <section className="styleguide-block" data-sg="fields" aria-labelledby="sg-fields">
        <h2 id="sg-fields">{t("fields")}</h2>
        <div className="styleguide-grid max-w-3xl">
          <Field
            id="sg-name"
            label={t("fieldName")}
            hint={t("fieldHint")}
            error={t("fieldError")}
          >
            <Input {...nameAria} invalid defaultValue="" autoComplete="name" />
          </Field>
          <Field id="sg-company" label={t("fieldCompany")}>
            <Input {...companyAria} autoComplete="organization" />
          </Field>
          <Field id="sg-site" label={t("fieldSite")}>
            <Select {...siteAria} defaultValue="hotel">
              <option value="hotel">{t("optionHotel")}</option>
              <option value="hospital">{t("optionHospital")}</option>
            </Select>
          </Field>
          <Field id="sg-comment" label={t("fieldComment")} className="sm:col-span-2">
            <Textarea {...commentAria} rows={3} />
          </Field>
        </div>
      </section>

      <section className="styleguide-block" aria-labelledby="sg-range">
        <h2 id="sg-range">{t("range")}</h2>
        <StyleguideRange />
      </section>

      <section className="styleguide-block" aria-labelledby="sg-table">
        <h2 id="sg-table">{t("table")}</h2>
        <StyleguideTable />
        <div className="mt-6">
          <StyleguideTable empty />
        </div>
      </section>

      <section className="styleguide-block" data-sg="rows" aria-labelledby="sg-rows">
        <h2 id="sg-rows">{t("rows")}</h2>
        <RowList>
          <Row
            href="/catalog"
            title="LAP-08 TP2 E"
            body={t("rowBody")}
            meta={t("rowMeta")}
          />
          <Row
            href="/catalog"
            title="LA-22 TP2 HW"
            body={t("rowBody")}
            meta={`22 ${t("unitKg")}`}
          />
        </RowList>
      </section>

      <section className="styleguide-block" data-sg="specs" aria-labelledby="sg-specs">
        <h2 id="sg-specs">{t("specs")}</h2>
        <SpecList
          items={[
            { term: "686×829×1019", description: "mm" },
            { term: "8–9", description: t("unitKg") },
            { term: "2.1", description: "kW" },
          ]}
        />
      </section>

      <section className="styleguide-block" data-sg="stat" aria-labelledby="sg-stat">
        <h2 id="sg-stat">{t("stat")}</h2>
        <Stat value="42" label={t("statLabel")} />
      </section>

      <section className="styleguide-block" data-sg="crumbs" aria-labelledby="sg-crumbs">
        <h2 id="sg-crumbs">{t("crumbs")}</h2>
        <Breadcrumbs
          label={t("crumbsNav")}
          items={[
            { label: t("crumbsHome"), href: "/" },
            { label: t("crumbsCatalog"), href: "/catalog" },
            { label: t("crumbsModel") },
          ]}
        />
      </section>

      <section className="styleguide-block" data-sg="silhouette" aria-labelledby="sg-sil">
        <h2 id="sg-sil">{t("silhouette")}</h2>
        <div className="draw inline-flex">
          <Silhouette widthMm={686} heightMm={1019} targetMaxPx={190} title="LAP-08" />
        </div>
      </section>

      <section className="styleguide-block" data-sg="drawing" aria-labelledby="sg-draw">
        <h2 id="sg-draw">{t("drawing")}</h2>
        <DimensionDrawing
          widthMm={686}
          heightMm={1019}
          targetMaxPx={300}
          title="LAP-08 TP2 E"
        />
      </section>

      <section className="styleguide-block" data-sg="model-image" aria-labelledby="sg-mi">
        <h2 id="sg-mi">{t("modelImage")}</h2>
        <div className="max-w-xs">
          <ModelImage product={DEMO_PRODUCT} />
        </div>
      </section>

      <Section className="styleguide-block" contained={false}>
        <div data-sg="section">
          <h2>{t("sectionTitle")}</h2>
          <p className="mt-2 text-steel">{t("intro")}</p>
        </div>
      </Section>
    </Container>
  );
}
