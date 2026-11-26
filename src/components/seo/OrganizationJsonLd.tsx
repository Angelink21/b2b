import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/json-ld";

type OrganizationJsonLdProps = {
  locale: string;
};

/** Organization + WebSite on the home page (no invented address/phone). */
export function OrganizationJsonLd({ locale }: OrganizationJsonLdProps) {
  return (
    <JsonLd data={[organizationJsonLd(locale), webSiteJsonLd(locale)]} />
  );
}
