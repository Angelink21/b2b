import { SiteHeader } from "@/components/layout/SiteHeader";
import { LOGO_DISPLAY_HEIGHT, siteConfig } from "@/config/site";
import { getCategoryNavStats } from "@/lib/catalog/queries";

function displayLogo(
  slot: typeof siteConfig.logo,
): { src: string; width: number; height: number } | null {
  if (slot.src.length === 0 || slot.width <= 0 || slot.height <= 0) return null;
  const height = LOGO_DISPLAY_HEIGHT;
  const width = Math.round((slot.width / slot.height) * height);
  return { src: slot.src, width, height };
}

export async function Header() {
  const logo = displayLogo(siteConfig.logo);
  const logoDark = displayLogo(siteConfig.logoDark);
  const categories = await getCategoryNavStats();

  return (
    <SiteHeader categories={categories} logo={logo} logoDark={logoDark} />
  );
}
