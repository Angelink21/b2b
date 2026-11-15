import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteConfig } from "@/config/site";
import { getCategoryNavStats } from "@/lib/catalog/nav";

export function Header() {
  const logo =
    siteConfig.logo.src.length > 0
      ? {
          src: siteConfig.logo.src,
          width: siteConfig.logo.width,
          height: siteConfig.logo.height,
        }
      : null;

  return (
    <SiteHeader categories={getCategoryNavStats()} logo={logo} />
  );
}
