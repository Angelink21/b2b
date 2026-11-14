import { siteConfig } from "@/config/site";

export function OrganizationJsonLd() {
  const data: Record<string, string> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
  };
  const url = siteConfig.url;
  if (url) {
    data.url = url;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
